# ClassProject

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


🎵 Angular Music Player

A responsive, interactive music player built with Angular 19, utilizing standalone components, signals for state management, and modern UI animations.

🚀 Features

Dynamic Playlist: Easily add, remove, and reorder tracks.

Interactive Player Controls: Play, pause, skip tracks, and track progress with visual animations.

Animated Soundwave Visualizer: Reacts dynamically when tracks are played.

Drag-and-Drop Reordering: Customize your playlist order effortlessly.

Modern Angular Structure: Fully standalone components using Angular Signals and services for smooth performance.

📸 Screenshots


Main interface showing tracklist, controls, and animated visualizer.

----under development----
Drag-and-drop functionality for playlist management.
----under development----

🛠️ Installation

Prerequisites

Node.js 18+

Angular CLI 19+

Setup Steps

Clone this repository:

git clone https://github.com/BlueCollarGiant/music-player

Navigate to the project directory:

cd angular-music-player

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
ng serve
```

Open your browser and go to:

```bash
http://localhost:4200
```

📚 Project Structure
```
📦src
 ┣ 📂app
 ┃ ┣ 📂assets
 ┃ ┃ ┗ 📂images
 ┃ ┃ ┃ ┗ 📜thumbnail.png
 ┃ ┣ 📂data
 ┃ ┃ ┗ 📜music-data.ts
 ┃ ┣ 📂music-player
 ┃ ┃ ┣ 📂footer
 ┃ ┃ ┃ ┗ 📂player-controls
 ┃ ┃ ┃ ┃ ┣ 📜player-controls.component.css
 ┃ ┃ ┃ ┃ ┣ 📜player-controls.component.html
 ┃ ┃ ┃ ┃ ┗ 📜player-controls.component.ts
 ┃ ┃ ┣ 📂header
 ┃ ┃ ┃ ┗ 📂nav-bar
 ┃ ┃ ┃ ┃ ┣ 📜nav-bar.component.css
 ┃ ┃ ┃ ┃ ┣ 📜nav-bar.component.html
 ┃ ┃ ┃ ┃ ┗ 📜nav-bar.component.ts
 ┃ ┃ ┣ 📂main
 ┃ ┃ ┃ ┗ 📂main-body
 ┃ ┃ ┃ ┃ ┣ 📂nowplaying-panel
 ┃ ┃ ┃ ┃ ┃ ┗ 📂right-panel
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂visualizer-container
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂visualizer
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜visualizer.component.css
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜visualizer.component.html
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📜visualizer.component.ts
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜right-panel.component.css
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜right-panel.component.html
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📜right-panel.component.ts
 ┃ ┃ ┃ ┃ ┣ 📂song-list-panel
 ┃ ┃ ┃ ┃ ┃ ┗ 📂playlist-panel
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂song-form
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜song-form.component.css
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜song-form.component.html
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📜song-form.component.ts
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂song-form-dialog
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜song-form-dialog.component.css
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜song-form-dialog.component.html
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📜song-form-dialog.component.ts
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜playlist-panel.component.css
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📜playlist-panel.component.html
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📜playlist-panel.component.ts
 ┃ ┃ ┃ ┃ ┣ 📜main-body.component.css
 ┃ ┃ ┃ ┃ ┣ 📜main-body.component.html
 ┃ ┃ ┃ ┃ ┗ 📜main-body.component.ts
 ┃ ┃ ┗ 📂Models
 ┃ ┃ ┃ ┗ 📜song.model.ts
 ┃ ┣ 📂services
 ┃ ┃ ┣ 📜music-player.service.ts
 ┃ ┃ ┣ 📜play-list-logic.service.ts
 ┃ ┃ ┗ 📜time.service.ts
 ┃ ┣ 📂shared
 ┃ ┃ ┗ 📜shared.module.ts
 ┃ ┣ 📜app.component.css
 ┃ ┣ 📜app.component.html
 ┃ ┣ 📜app.component.ts
 ┃ ┣ 📜app.config.server.ts
 ┃ ┣ 📜app.config.ts
 ┃ ┣ 📜app.routes.server.ts
 ┃ ┗ 📜app.routes.ts
 ┣ 📜index.html
 ┣ 📜main.server.ts
 ┣ 📜main.ts
 ┣ 📜server.ts
 ┗ 📜styles.css
```

🔄 Angular Signals & State Management

This project leverages Angular Signals to efficiently manage and update state dynamically without unnecessary re-rendering, providing an optimized user experience.

🤝 Contributing

Contributions are welcome! Feel free to fork the repository, open an issue, or submit pull requests.

📃 License

This project is licensed under the MIT License - see the LICENSE file for details.

🌟 Acknowledgments

Angular Documentation

Community tutorials on Angular Signals and standalone components

Inspiration from modern music app designs

Enjoy your tunes! 🎧


