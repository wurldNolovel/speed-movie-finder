import requests

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response


TMDB_BASE_URL = "https://api.themoviedb.org/3"


@api_view(["GET"])
def movie_list(request):

    api_key = settings.TMDB_API_KEY

    if not api_key:
        return Response(
            {"error": "TMDB API key is not configured."},
            status=500
        )

    query = request.query_params.get("query", "").strip()

    if query:
        url = f"{TMDB_BASE_URL}/search/movie"
    else:
        url = f"{TMDB_BASE_URL}/movie/popular"

    params = {
        "api_key": api_key,
        "language": "en-US",
        "page": request.query_params.get("page", 1)
    }

    if query:
        params["query"] = query
        params["include_adult"] = "false"

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        return Response(
            response.json(),
            status=response.status_code
        )

    except requests.RequestException:
        return Response(
            {"error": "Unable to connect to TMDB."},
            status=502
        )

@api_view(["GET"])
def movie_detail(request, movie_id):

    api_key = settings.TMDB_API_KEY

    if not api_key:
        return Response(
            {"error": "TMDB API key is not configured."},
            status=500
        )

    url = f"{TMDB_BASE_URL}/movie/{movie_id}"

    params = {
        "api_key": api_key,
        "language": "en-US"
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        return Response(
            response.json(),
            status=response.status_code
        )

    except requests.RequestException:
        return Response(
            {"error": "Unable to connect to TMDB."},
            status=502
        )