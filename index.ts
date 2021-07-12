#!/usr/bin/env node

import { exec } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { promisify  } from 'util';

import * as arg from 'arg';
import * as prompts from 'prompts';

function copyDirectory(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });

  const entries = readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const entrySource = join(source, entry.name);
    const entryDestination = join(destination, entry.name);

    entry.isDirectory()
      ? copyDirectory(entrySource, entryDestination)
      : copyFileSync(entrySource, entryDestination);
  }
}

async function copyTemplateAndInstallDependencies(
  template: string,
  destination: string,
  packageName: string,
): Promise<void> {
  const templateName = basename(template);

  if (!existsSync(template)) {
    throw new Error(`Unable to find template "${templateName}"`);
  }

  console.log(`\n[${templateName}]: Creating project scaffold...`);
  copyDirectory(template, destination);

  if (existsSync(join(destination, '_gitignore'))) {
    renameSync(join(destination, '_gitignore'), join(destination, '.gitignore'));
  }

  if (existsSync(join(destination, 'package.json'))) {
    const pkg = require(join(destination, 'package.json'));
    pkg.name = packageName;
    writeFileSync(join(destination, 'package.json'), JSON.stringify(pkg, null, 2));
    console.log(`[${templateName}]: Installing dependencies...`);
    await promisify(exec)('npm install', { cwd: destination });
  }
}

async function main() {
  const args = arg({
    '--client': String,
    '--server': String,
    '--version': Boolean,
  });

  if (args['--version']) {
    console.log(require('./package.json').version);
    return;
  }

  let [targetDirectory] = args._;

  if (!targetDirectory) {
    throw new Error('Project name must be specified');
  }

  targetDirectory = resolve(targetDirectory);

  if (existsSync(targetDirectory)) {
    throw new Error(`"${targetDirectory}" already exists`);
  }

  const projectName = basename(targetDirectory);

  if (!/^[a-z0-9-]+$/.test(projectName)) {
    throw new Error('Project name must be lower case containing only letters, numbers and dashes.');
  }

  let clientTemplate = args['--client'];
  let serverTemplate = args['--server'];

  if (!clientTemplate && !serverTemplate) {
    const clientTemplateOptions = [
      ...readdirSync(join(__dirname, 'templates', 'client'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          return { title: entry.name[0].toUpperCase() + entry.name.slice(1), value: entry.name }
        }),
      { title: 'none', value: null }
    ];

    const serverTemplateOptions = [
      ...readdirSync(join(__dirname, 'templates', 'server'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          return { title: entry.name, value: entry.name }
        }),
      { title: 'none', value: null }
    ];

    console.log();

    const response = await prompts([
      {
        type: 'select',
        name: 'clientTemplate',
        message: 'Select a client template',
        choices: clientTemplateOptions
      },
      {
        type: 'select',
        name: 'serverTemplate',
        message: 'Select a server template',
        choices: serverTemplateOptions
      }
    ]);

    clientTemplate = response.clientTemplate;
    serverTemplate = response.serverTemplate;
  }

  if (clientTemplate) {
    await copyTemplateAndInstallDependencies(
      join(__dirname, 'templates', 'client', clientTemplate),
      serverTemplate ? join(targetDirectory, 'client') : targetDirectory,
      serverTemplate ? `${projectName}-client` : projectName
    );
  }

  if (serverTemplate) {
    await copyTemplateAndInstallDependencies(
      join(__dirname, 'templates', 'server', serverTemplate),
      clientTemplate ? join(targetDirectory, 'server') : targetDirectory,
      clientTemplate ? `${projectName}-server` : projectName
    );
  }
}

main()
  .then(() => {
    console.log('\n✅ Project successfully created!\n');
  })
  .catch((error) => {
    console.error(`\nError: ${error.message}\n`);
  });
