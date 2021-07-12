# @epandco/create-app

A simple CLI to quickly scaffold projects using EP+Co's standard project templates

## Usage

It is highly recommended to use `@epandco/create-app` via `npx` to ensure the latest version of the CLI and templates
are used.

```
npx @epandco/create-app <project-name> [options]
```

Follow the prompts to select a client template and/or server template, or use the `--client` and `--server` options
to quickly bypass the prompts.

### Available templates

- Client
  - [react](templates/client/react)

### Examples

```
npx @epandco/create-app my-app
```

```
npx @epandco/create-app my-app --client react --server express
```