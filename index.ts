#!/usr/bin/env node

import { exec } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { promisify  } from 'util';

import * as arg from 'arg';
import * as ora from 'ora';

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

async function copyAndInstallTemplate(
  template: string,
  destination: string,
  packageName: string,
): Promise<void> {
  if (!existsSync(template)) {
    throw new Error(`Unable to find template "${basename(template)}"`);
  }

  copyDirectory(template, destination);

  if (existsSync(join(destination, '_gitignore'))) {
    renameSync(join(destination, '_gitignore'), join(destination, '.gitignore'));
  }

  if (existsSync(join(destination, 'package.json'))) {
    const pkg = require(join(destination, 'package.json'));
    pkg.name = packageName;
    writeFileSync(join(destination, 'package.json'), JSON.stringify(pkg, null, 2));
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

  if (args['--client']) {
    await copyAndInstallTemplate(
      join(__dirname, 'templates', 'client', args['--client']),
      args['--server'] ? join(targetDirectory, 'client') : targetDirectory,
      args['--server'] ? `${projectName}-client` : projectName
    );
  }

  if (args['--server']) {
    await copyAndInstallTemplate(
      join(__dirname, 'templates', 'server', args['--server']),
      args['--client'] ? join(targetDirectory, 'server') : targetDirectory,
      args['--client'] ? `${projectName}-server` : projectName
    );
  }
}

const spinner = ora({text: 'Creating project', prefixText: '\n'}).start();

main()
  .then(() => {
    spinner.succeed('Project successfully created!\n')
  })
  .catch((error) => {
    spinner.fail(error.message + '\n');
  });
