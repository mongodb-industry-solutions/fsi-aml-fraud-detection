# Demo Template: Python Backend with Next.js Frontend

This repository provides a template for creating a web application with a Python backend and a Next.js frontend. The backend is managed using Poetry for dependency management, while the frontend is built with Next.js, offering a modern React-based user interface.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Create a New Repository](#create-a-new-repository)
  - [GitHub Desktop Setup](#github-desktop-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)

## Features

- Python backend with a RESTful API powered by [FastAPI](https://fastapi.tiangolo.com/)
- Next.js frontend for a responsive user interface
- Dependency management with Poetry ([More info](https://python-poetry.org/docs/basic-usage/))
- Easy setup and configuration

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Python 3.10 or higher (but less than 3.11)
- Node.js 14 or higher
- Poetry (install via [Poetry's official documentation](https://python-poetry.org/docs/#installation))

## Getting Started

Follow these steps to set up the project locally.

### Create a New Repository

1. Navigate to the repository template on GitHub and click on **Use this template**.
2. Create a new repository.
3. **Do not** check the "Include all branches" option.
4. Define a repository name following the naming convention: `<industry>-<project_name>-<highlighted_feature>`. For example, `fsi-leafybank-ai-personal-assistant` (use hyphens to separate words).
   - The **industry** and **project name** are required; you can be creative with the highlighted feature.
5. Provide a clear description for the repository, such as: "A repository template to easily create new demos by following the same structure."
6. Set the visibility to **Internal**.
7. Click **Create repository**.

### GitHub Desktop Setup

1. Install GitHub Desktop if you haven't already. You can download it from [GitHub Desktop's official website](https://desktop.github.com/).
2. Open GitHub Desktop and sign in to your GitHub account.
3. Clone the newly created repository:
   - Click on **File** > **Clone Repository**.
   - Select your repository from the list and click **Clone**.
4. Create your first branch:
   - In the GitHub Desktop interface, click on the **Current Branch** dropdown.
   - Select **New Branch** and name it `feature/branch01`.
   - Click **Create Branch**.

### Backend Setup

1. (Optional) Set your project description and author information in the `pyproject.toml` file:
   ```toml
   description = "Your Description"
   authors = ["Your Name <you@example.com>"]
2. Open the project in your preferred IDE (the standard for the team is Visual Studio Code).
3. Open the Terminal within Visual Studio Code.
4. Ensure you are in the root project directory where the `makefile` is located.
5. Execute the following commands:
  - Poetry start
    ````bash
    make poetry_start
    ````
  - Poetry install
    ````bash
    make poetry_install
    ````
6. Verify that the `.venv` folder has been generated within the `/backend` directory.

### Frontend Setup

1. Navigate to the `frontend` folder.
2. Install dependencies by running:
```bash
npm install
```
3. Start the frontend development server with:
````bash
npm run dev
````
4. The frontend will now be accessible at http://localhost:3000 by default, providing a user interface.

## DEMO README

<h1 style="color:red">REPLACE THE CONTENT OF THIS README WITH `README-demo.md` and DELETE THE `README-demo.md` FILE!!!!!!!!! </h1>