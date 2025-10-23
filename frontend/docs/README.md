# Documentation

This folder contains technical documentation for the OmniPlay frontend application.

## 📂 Folder Structure

```
docs/
├── architecture/           # Architecture decisions and patterns
│   └── spotify-adapter-refactoring.md
├── guides/                 # Developer guides (create as needed)
└── README.md              # This file
```

## 📖 Available Documentation

### Architecture
- **[Spotify Adapter Refactoring](./architecture/spotify-adapter-refactoring.md)** - Details on the SOLID refactoring of the Spotify adapter, including folder structure, principles applied, and migration guide.

## 🎯 Documentation Best Practices

### When to Create Docs
- Architecture decisions (ADRs)
- Complex design patterns
- Migration guides
- API integration guides

### Where to Put Docs
- `architecture/` - System design, patterns, refactorings
- `guides/` - How-to guides for developers
- `api/` - API documentation (if not using Swagger/OpenAPI)

### What NOT to Document Here
- Code-level docs → Use JSDoc/TSDoc in source files
- User guides → Separate user documentation
- Project setup → Keep in root README.md
