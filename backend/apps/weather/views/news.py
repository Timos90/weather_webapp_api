import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from apps.weather.serializers.news import NewsSerializer
from apps.user.models import UserProfile

class NewsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        user_profile = UserProfile.objects.filter(user=user).first()
        location = request.query_params.get('location', '').strip()

        if not location and user_profile and user_profile.location:
            location = user_profile.location.strip()

        if not location:
            return Response([], status=status.HTTP_200_OK)

        def fetch_newsapi_articles(search_string: str):
            url = 'https://newsapi.org/v2/everything'
            params = {
                'q': f'weather {search_string}',
                'apiKey': os.getenv('NEWS_API_KEY'),
                'sortBy': 'publishedAt',
            }
            r = requests.get(url, params=params)
            r.raise_for_status()
            return r.json().get('articles', [])

        weather_keywords = [
            # Arabic
            "طقس", "عاصفة", "مطر", "ثلج", "مناخ", "فيضان", "إعصار", "تايفون", "رياح", "توقع", "مشمس", "غائم", "برد", "رعد", "برق", "ضباب",
            # German
            "Wetter", "Sturm", "Regen", "Schnee", "Klima", "Flut", "Hurrikan", "Taifun", "Wind", "Vorhersage", "sonnig", "bewölkt", "Hagel", "Donner", "Blitz", "Nebel",
            # English
            "weather", "storm", "rain", "snow", "climate", "flood", "hurricane", "typhoon", "wind", "forecast", "sunny", "cloudy", "hail", "thunder", "lightning", "fog",
            # Spanish
            "tiempo", "tormenta", "lluvia", "nieve", "clima", "inundación", "huracán", "tifón", "viento", "pronóstico", "nublado", "despejado", "granizo", "trueno", "relámpago", "niebla",
            # French
            "météo", "tempête", "pluie", "neige", "climat", "inondation", "ouragan", "typhon", "vent", "prévision", "nuageux", "ensoleillé", "grêle", "tonnerre", "éclair", "brouillard",
            # Hebrew
            "מזג אוויר", "סופה", "גשם", "שלג", "אקלים", "שיטפון", "הוריקן", "טייפון", "רוח", "תחזית", "בהיר", "מעונן", "ברד", "רעם", "הבזק", "ערפל",
            # Italian
            "tempo", "tempesta", "pioggia", "neve", "clima", "alluvione", "uragano", "tifone", "vento", "previsione", "soleggiato", "nuvoloso", "grandine", "tuono", "fulmine", "nebbia",
            # Dutch
            "weer", "storm", "regen", "sneeuw", "klimaat", "overstroming", "orkaan", "tifoon", "wind", "voorspelling", "zonnig", "bewolkt", "hagel", "donder", "bliksem", "mist",
            # Norwegian
            "vær", "storm", "regn", "snø", "klima", "flom", "orkan", "tyfon", "vind", "værmelding", "solfylt", "skyet", "hagl", "torden", "lyn", "tåke",
            # Portuguese
            "tempo", "tempestade", "chuva", "neve", "clima", "inundação", "furacão", "tufão", "vento", "previsão", "ensolarado", "nublado", "granizo", "trovão", "relâmpago", "neblina",
            # Russian
            "погода", "шторм", "дождь", "снег", "климат", "наводнение", "ураган", "тайфун", "ветер", "прогноз", "облачно", "солнечно", "град", "гром", "молния", "туман",
            # Swedish
            "väder", "storm", "regn", "snö", "klimat", "översvämning", "orkan", "tyfon", "vind", "prognos", "soligt", "molnigt", "hagel", "åska", "blixt", "dimma",
            # Urdu (ud)
            "موسم", "طوفان", "بارش", "برف", "آب و ہوا", "سیلاب", "ہریکن", "تائی فون", "ہوا", "پیش گوئی", "دھوپ", "بادل", "اولے", "گرج", "بجلی", "دھند",
            # Chinese
            "天气", "风暴", "雨", "雪", "气候", "洪水", "飓风", "台风", "风", "预报", "晴", "多云", "冰雹", "雷", "闪电", "雾"
        ]

        def filter_weather_articles(articles):
            filtered = []
            for article in articles:
                title_lower = (article.get("title") or "").lower()
                desc_lower = (article.get("description") or "").lower()
                if len(title_lower) > 200:
                    continue
                if any(kw in title_lower for kw in weather_keywords) \
                   or any(kw in desc_lower for kw in weather_keywords):
                    filtered.append({
                        "title": article["title"],
                        "url": article["url"],
                        "publishedAt": article["publishedAt"],
                        "content": article["content"],
                        "urlToImage": article.get("urlToImage"),
                    })
            return filtered

        try:
            articles_city = fetch_newsapi_articles(location)
            city_filtered = filter_weather_articles(articles_city)

            if city_filtered:
                serializer = NewsSerializer(data=city_filtered, many=True)
                if serializer.is_valid():
                    return Response(serializer.data, status=status.HTTP_200_OK)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            return Response([], status=status.HTTP_200_OK)

        except requests.exceptions.HTTPError as http_err:
            if hasattr(http_err, 'response') and http_err.response.status_code == 429:
                return Response({'error': 'News API request limit reached. Please try again later.'},
                                status=status.HTTP_429_TOO_MANY_REQUESTS)
            return Response({'error': 'Failed to fetch news'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as err:
            return Response({'error': 'Failed to fetch news'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
