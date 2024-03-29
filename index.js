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


let appName = 'MyApp';
let useTypescript = false;
let onCancel = true;

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
}
`;
const appTsx = `export default function App() {
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
}
`;
const tsConfigJson = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "node",
    "forceConsistentCasingInFileNames": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;
const tsConfigNodeJson = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "rootDir": "./"
  },
  "include": ["vite.config.ts"]
}
`;

const gitignore = `# Node.js
node_modules/

# Output
build/
dist/
out/

# IDE
.vscode/
.idea/

# Dependency directories
typings/

# Compiled TypeScript
*.js
*.js.map

# TypeScript cache
*.tsbuildinfo

# Tailwind CSS
tailwind.config.js
postcss.config.js

# Shadow DOM (if using a specific library)
shadow-clones/

# Editor files
*.swp
*.swo
*.swn
*.swo
*.swn
*.swp
`

const sleep = (ms = 2000) => new Promise(r => setTimeout(r, ms));

function print_stdout(stdout) {
  for (const line of stdout.split('\n')) {
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
  const { stdout } = await sh(cmd, dir)
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
      return 'MyApp'
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
  createFile(`./${appName}/src/App.${useTypescript ? 'tsx' : 'jsx'}`, appTsx);
  createFile(`./${appName}/tsconfig.json`, tsConfigJson);
  createFile(`./${appName}/tsconfig.node.json`, tsConfigNodeJson);
  createFile(`./${appName}/.gitignore`, gitignore);

  rimraf.sync(`./${appName}/src/App.css`);
}

async function initializeRepo(){
  await execute(
    'git init',
    'Initializing Git Repo',
    appName
  );
  await execute(
    'git add .',
    'Stagging',
    appName
  );
  await execute(
    'git commit -m "First commit"',
    'Initializing Git Repo',
    appName
  );
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
await initializeRepo();
done()

console.log(`
  ${chalk.bgBlue('INFO:')}
  To run use:

  cd ${appName}

  npm run dev
`)
