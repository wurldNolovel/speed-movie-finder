# Speed Movie Finder 🎬

A responsive movie discovery application built with HTML, CSS, JavaScript, Python and Django REST Framework.

Discover popular movies, search for films, explore movie details and save your favorite movies.

## Features

- Browse popular movies.
- Search for movies.
- View detailed movie information.
- Save favorite movies.
- Responsive user interface.
- Django REST API integration.
- Secure TMDB API key handling through environment variables.

## Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Python
- Django
- Django REST Framework
- Requests

**External API**
- The Movie Database (TMDB)

## Project Structure

```text
Speed-Movie-Finder/
├── index.html
├── README.md
├── .gitignore
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── backend/
    ├── config/
    ├── movies/
    ├── requirements.txt
    └── manage.py
```

## Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```cmd
.venv\Scripts\activate
```

Install dependencies:

```cmd
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file inside the backend folder:

```env
TMDB_API_KEY=your_tmdb_api_key
```

Never upload your real API key to GitHub.

### 4. Prepare the database

```cmd
python manage.py migrate
```

### 5. Start the Django server

```cmd
python manage.py runserver
```

### 6. Launch the frontend

Open the main project folder in VS Code and launch `index.html` using Live Server.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/movies/` | Popular movies |
| GET | `/api/movies/?query=batman` | Search movies |
| GET | `/api/movies/?page=2` | Movie pagination |
| GET | `/api/movies/550/` | Movie details |

## External API

Movie information is provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).

## Project Status

Portfolio project — core movie discovery and backend integration implemented.

## Author

Developed as a personal web development portfolio project.
