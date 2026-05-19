{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "./",
    "outDir": "./dist",
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid"
  },
  "references": [
    { "path": "../../packages/domain" },
    { "path": "../../packages/infra" },
    { "path": "../../packages/tools" },
    { "path": "../../packages/lib" },
    { "path": "../../packages/agents" },
  ],
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
