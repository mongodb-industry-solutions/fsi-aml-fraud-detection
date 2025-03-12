# Demo Template: Python Backend

Python backend section built using [FastAPI](https://fastapi.tiangolo.com/). The backend is managed using Poetry for dependency management, offering a RESTful API.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- Python backend with a RESTful API powered by FastAPI
- Dependency management with Poetry ([More info](https://python-poetry.org/docs/basic-usage/))
- Easy setup and configuration

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Python 3.10 or higher (but less than 3.11)
- Poetry (install via [Poetry's official documentation](https://python-poetry.org/docs/#installation))

For complete setup instructions, including how to create a new repository and clone it, please refer to the [parent README](../README.md).

## Getting Started

Follow these steps to set up the backend project locally. For detailed instructions on creating a new repository and using GitHub Desktop, please refer to the [parent README](../README.md).

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
