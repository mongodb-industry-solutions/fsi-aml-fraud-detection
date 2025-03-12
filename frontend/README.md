# Next.js Frontend

## Getting Started 

1. Install dependencies by running:
```bash
npm install
```
2. Start the frontend development server with:
````bash
npm run dev
````
3. The frontend will now be accessible at http://localhost:3000 by default, providing a user interface to interact with the image vector search demo.


## Understanding Next.js

### Routes

In Next.js, routes are created inside the `app` directory. Here's a breakdown of how the routing works:

#### API Routes

- The `api` folder is used for creating API routes.
- We have two example routes for demonstrating how API routes work:

  - **GET request to MongoDB**:  
    [http://localhost:3000/api/mongodb](http://localhost:3000/api/mongodb)

  - **Basic test route**:  
    [http://localhost:3000/api/test](http://localhost:3000/api/test)

#### Dynamic Routes

- If you create a new folder inside the `app` directory, a route will be automatically created based on the folder name.
- For example, creating a folder called `example` will make it accessible at:
  [http://localhost:3000/example](http://localhost:3000/example)

Each route includes a `layout.js` and `page.js` to define the structure and content.

#### Root Route

- The global root route (home page) is accessible at:
  [http://localhost:3000](http://localhost:3000)

This page is managed by the `layout.js` and `page.js` inside the `app` directory.


### Components

Components are located outside the `app` folder, inside the `components` directory.

There are two example components:

1. **MongoDB Leafy Green System Design**: Demonstrates how to integrate MongoDB with your component.
2. **Test Component**: Shows how to create a simple test component that includes both a `.jsx` file and a `.module.css` file for styling.

#### CSS

Each component should have its own dedicated CSS file. For styling, we recommend using CSS Modules (e.g., `component.module.css`) to scope styles locally to the component.

#### Images

For adding images, we use `Image` from `next/image`, which is provided by Next.js. This component optimizes images for caching and better performance.

- Images should be stored in the `public` folder inside the `frontend` directory.
- Next.js automatically handles these images, making them easily accessible.

For an example, check out the `test.jsx` component.

### MongoDB Connections

This template includes a `lib` folder with a utility for connecting to MongoDB. 

Inside the `lib` folder, you’ll find a function called `connectToDatabase`. To use it, simply import the function and pass the necessary parameters to specify which database and collection you want to connect to.

The `connectToDatabase` function manages the connection and can be reused across your application for efficient MongoDB interactions.

### .env.local

Next.js natively supports `.env.local` files, so you don't need to install additional libraries like `dotenv`. Simply create a `.env.local` file, and Next.js will automatically detect and load it.

Make sure to place the `.env.local` file inside the `frontend` folder for proper configuration.