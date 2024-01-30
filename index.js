#!/usr/bin/env node

import { exec } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { existsSync, rmdirSync } from 'fs';
import { rimraf } from 'rimraf';
import fs from 'fs/promises';


let appName;
let useTypescript;
let onCancel;

const tailwindConfigJs = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

const appTsx = `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

export default function App() {
  return (
    <>
      <div className="bg-gray-200 p-8">
      <h1 className="text-3xl font-bold mb-4 text-center">Tailwind CSS Sample Page</h1>

      <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-md mb-6">
        <p className="text-gray-700">Responsive Text:</p>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">This text adjusts based on screen size.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500 text-white p-4 rounded-md shadow-md">
          Card 1
        </div>
        <div className="bg-green-500 text-white p-4 rounded-md shadow-md">
          Card 2
        </div>
        <div className="bg-yellow-500 text-white p-4 rounded-md shadow-md">
          Card 3
        </div>
      </div>

      <button className="bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none">
        Click Me
      </button>
    </div>
    </>
  )
}`

const sleep = (ms = 2000) => new Promise(r => setTimeout(r, ms));

function print_stdout(stdout) {
  for (let line of stdout.split('\n')) {
    console.log(`${line}`);
  }
}

async function sh(cmd, dir) {
  return new Promise(function (resolve, reject) {
    exec(cmd, {cwd: dir}, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  })
}

async function execute(cmd, msg, dir="."){
  const spinner = createSpinner(msg).start();
  let { stdout } = await sh(cmd, dir)
  print_stdout(stdout)
  spinner.success()
}

async function deleteDirectory(directoryPath) {
  const answers = await inquirer.prompt({
    name: 'delete_directory',
    type: 'list',
    message: `Target directory "${appName}" is not empy. Please choose how to proceed:`,
    default() {
      return 'Cancel operation'
    },
    choices: [
      'Cancel operation',
      'Remove existing files and continue',
    ],
  });

  onCancel = answers.delete_directory === 'Cancel operation'
  if (onCancel){
    process.exit();
  } else {
    rimraf.sync(directoryPath);
  }
}

async function detectExistence() {
  const directoryPath = `./${appName}`;

  if(existsSync(directoryPath)) {
    await deleteDirectory(directoryPath);
  }
}

function createFile(fileName, data="") {
    fs.writeFile(fileName, data, (err) => {
    if(err){
      console.error(`Error creating ${fileName}: ${err.message}`);
      process.exit();
    }
  })
}

async function askName() {
  const answers = await inquirer.prompt({
    name: 'app_name',
    type: 'input',
    message: 'Project name:',
    default() {
      return 'App'
    },
  });

  appName = answers.app_name;
  
  await detectExistence();
}

async function askTypescript() {
  const answers = await inquirer.prompt({
    name: 'use_typescript',
    type: 'list',
    message: 'Use Typescript?',
    default() {
      return 'y'
    },
    choices: [
      'y',
      'n',
    ],
  });

  useTypescript = answers.use_typescript === 'y';
}

async function createVite() {
  await execute(
    `npm create vite@latest ${appName} -- --template react${useTypescript ? '-ts' : ''}`,
    'Creating project'
  )
}

async function npmInstall() {
  await execute(
    'npm install',
    'Installing dependencies',
    appName
  )
}

async function installTailwind() {
  await execute(
    'npm install -D tailwindcss postcss autoprefixer',
    'Installing Tailwind',
    appName
  )
  await execute(
    'npx tailwindcss init -p',
    'Initializing Tailwind',
    appName
  )

  createFile(`./${appName}/tailwind.config.js`, tailwindConfigJs);
  createFile(`./${appName}/src/index.css`,
  `@tailwind base;
@tailwind components;
@tailwind utilities;
  `);
  createFile(`./${appName}/src/App.tsx`, appTsx);
}

function done() {
  const msg = `${appName} created`
  figlet(msg, (err, data) => {
    console.log(gradient.pastel.multiline(data))
  })
}


console.log(chalk.cyan('Create React App with Vite and shadcn'));

console.log(`
  ${chalk.bgBlue('INFO:')}
  This tool uses Vite, Tailwind and shadcn cli tools
`)

await askName();
await askTypescript();
await createVite();
await npmInstall();
await installTailwind();
done()

console.log(`
  ${chalk.bgBlue('INFO:')}
  To run use:

  cd ${appName}

  npm run dev
`)
