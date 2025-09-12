import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from apps.user.models import UserProfile
from apps.weather.serializers.news import NewsSerializer
import traceback
import pycountry
import logging

logger = logging.getLogger(__name__)

def get_country_code_from_owm(location_name_str: str):
    owm_api_key = os.getenv('OPENWEATHERMAP_API_KEY')
    if not owm_api_key:
        logger.error("OpenWeatherMap API key not found for geocoding.")
        return None
    
    geocoding_url = 'http://api.openweathermap.org/geo/1.0/direct'
    params = {'q': location_name_str, 'limit': 1, 'appid': owm_api_key}
    try:
        response = requests.get(geocoding_url, params=params)
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            country_code = data[0].get('country')
            if country_code:
                return country_code
        logger.warning(f"Could not determine country code for location '{location_name_str}' from OWM geocoding.")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error geocoding {location_name_str}: {e}")
    return None


class NewsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    WEATHER_KEYWORDS = [
        # Arabic
        "طقس", "عاصفة", "مطر", "ثلج", "مناخ", "فيضان", "إعصار", "تايفون", "رياح", "توقع", "مشمس", "غائم", "برد", "رعد", "برق", "ضباب",
        # German
        "Wetter", "Sturm", "Regen", "Schnee", "Klima", "Flut", "Hurrikan", "Taifun", "Wind", "Vorhersage", "sonnig", "bewölkt", "Hagel", "Donner", "Blitz", "Nebel",
        # English
        'weather', 'storm', 'rain', 'snow', 'climate', 'flood', 'hurricane', 'typhoon', 'wind', 'forecast', 'sunny', 'cloudy', 'hail', 'thunder', 'lightning', 'fog',
        # Spanish
        'tiempo', 'tormenta', 'lluvia', 'nieve', 'clima', 'inundación', 'huracán', 'tifón', 'viento', 'pronóstico', 'nublado', 'despejado', 'granizo', 'trueno', 'relámpago', 'niebla',
        # French
        'météo', 'tempête', 'pluie', 'neige', 'climat', 'inondation', 'ouragan', 'typhon', 'vent', 'prévision', 'nuageux', 'ensoleillé', 'grêle', 'tonnerre', 'éclair', 'brouillard',
        # Hebrew
        'מזג אוויר', 'סופה', 'גשם', 'שלג', 'אקלים', 'שיטפון', 'הוריקן', 'טייפון', 'רוח', 'תחזית', 'בהיר', 'מעונן', 'ברד', 'רעם', 'הבזק', 'ערפל',
        # Italian
        'tempo', 'tempesta', 'pioggia', 'neve', 'clima', 'alluvione', 'uragano', 'tifone', 'vento', 'previsione', 'soleggiato', 'nuvoloso', 'grandine', 'tuono', 'fulmine', 'nebbia',
        # Dutch
        'weer', 'storm', 'regen', 'sneeuw', 'klimaat', 'overstroming', 'orkaan', 'tifoon', 'wind', 'voorspelling', 'zonnig', 'bewolkt', 'hagel', 'donder', 'bliksem', 'mist',
        # Norwegian
        'vær', 'storm', 'regn', 'snø', 'klima', 'flom', 'orkan', 'tyfon', 'vind', 'værmelding', 'solfylt', 'skyet', 'hagl', 'torden', 'lyn', 'tåke',
        # Portuguese
        'tempo', 'tempestade', 'chuva', 'neve', 'clima', 'inundação', 'furacão', 'tufão', 'vento', 'previsão', 'ensolarado', 'nublado', 'granizo', 'trovão', 'relâmpago', 'neblina',
        # Russian
        'погода', 'шторм', 'дождь', 'снег', 'климат', 'наводнение', 'ураган', 'тайфун', 'ветер', 'прогноз', 'облачно', 'солнечно', 'град', 'гром', 'молния', 'туман',
        # Swedish
        'väder', 'storm', 'regn', 'snö', 'klimat', 'översvämning', 'orkan', 'tyfon', 'vind', 'prognos', 'soligt', 'molnigt', 'hagel', 'åska', 'blixt', 'dimma',
        # Urdu (ud)
        'موسم', 'طوفان', 'بارش', 'برف', 'آب و ہوا', 'سیلاب', 'ہریکن', 'تائی فون', 'ہوا', 'پیش گوئی', 'دھوپ', 'بادل', 'اولے', 'گرج', 'بجلی', 'دھند',
        # Chinese
        '天气', '风暴', '雨', '雪', '气候', '洪水', '飓风', '台风', '风', '预报', '晴', '多云', '冰雹', '雷', '闪电', '雾'
    ]

    @staticmethod
    def _filter_weather_articles(articles_to_filter):
        seen_urls = set()
        deduplicated_articles = []
        for article in articles_to_filter:
            url = article.get('url')
            if url and url not in seen_urls:
                seen_urls.add(url)
                deduplicated_articles.append(article)
        
        logger.info(f"Deduplicated {len(articles_to_filter)} articles down to {len(deduplicated_articles)}.")

        filtered = []
        for article in deduplicated_articles:
            title_lower = (article.get("title") or "").lower()
            desc_lower = (article.get("description") or "").lower()
            if any(kw in title_lower for kw in NewsView.WEATHER_KEYWORDS) \
               or any(kw in desc_lower for kw in NewsView.WEATHER_KEYWORDS):
                filtered.append(article)
        return filtered

    def get(self, request, *args, **kwargs):
        user = request.user
        try:
            user_profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            user_profile = None
        
        location = request.query_params.get('location', '').strip()
        news_api_key = os.getenv('NEWS_API_KEY')

        if not news_api_key:
            logger.error("NewsAPI key not found. Please set NEWS_API_KEY environment variable.")
            return Response({"error": "News service configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not location and user_profile and user_profile.location:
            location = user_profile.location.strip()

        if not location:
            return Response([], status=status.HTTP_200_OK)



        original_location = location
        parts = [p.strip() for p in location.split(',')]
        country_code = None

        # Heuristic to check if the last part of the location is a country code
        if len(parts) > 1 and len(parts[-1]) == 2 and parts[-1].isalpha():
            potential_code = parts[-1].upper()
            try:
                # Validate if it's a real country code
                pycountry.countries.get(alpha_2=potential_code)
                country_code = potential_code
                location = ', '.join(parts[:-1])  # Redefine location to be just the city part
            except (LookupError, AttributeError):
                # Not a valid code, so geocode the whole string
                country_code = get_country_code_from_owm(location)
        else:
            # No obvious country code, geocode the whole string
            country_code = get_country_code_from_owm(location)

        country_name = None
        if country_code:
            try:
                country = pycountry.countries.get(alpha_2=country_code)
                country_name = country.name if country else None
            except Exception as e:
                logger.warning(f"Could not find country name for code: {country_code}, error: {e}")
        
        logger.info(f"Using location: '{location}', country_code: '{country_code}', country_name: '{country_name}' from original: '{original_location}'")

        common_weather_terms = [
            'weather', 'forecast', 'climate', 'rain', 'snow', 'storm', 'temperature',
            'humidity', 'wind', 'precipitation', 'heat wave', 'cold snap', 'blizzard',
            'drought', 'flood', 'cyclone', 'hurricane', 'typhoon'
        ]
        weather_query_part_str = " OR ".join(common_weather_terms)

        def fetch_top_headlines_news_internal(loc_str: str, w_query_part: str, current_country_code: str):
            url = 'https://newsapi.org/v2/top-headlines'
            params = {'apiKey': news_api_key, 'pageSize': 10}
            
            quoted_loc = f'\"{loc_str}\"' if ' ' in loc_str else loc_str
            params['q'] = f'{quoted_loc} AND ({w_query_part})'
            
            if current_country_code:
                params['country'] = current_country_code
            
            logger.info(f"--- NewsAPI Call (fetch_top_headlines_news) ---")
            logger.info(f"URL: {url}")
            logger.info(f"Params: {params}")
            articles_list = []
            try:
                r = requests.get(url, params=params)
                r.raise_for_status()
                response_data = r.json()
                articles_list = response_data.get('articles', [])
                logger.info(f"Received {len(articles_list)} articles from top headlines.")
                for i, article in enumerate(articles_list):
                    logger.info(f"  Top Headline Article {i} title: {article.get('title')}")

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    logger.warning("NewsAPI rate limit exceeded for top headlines.")
                else:
                    logger.error(f"HTTP Error fetching top headlines with params {params}: {e}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching top headlines with params {params}: {e}")
            return articles_list

        def fetch_everything_news_internal(search_loc: str, w_terms_list: list, current_country_name: str):
            url = 'https://newsapi.org/v2/everything'
            w_terms_q_part = " OR ".join(w_terms_list)
            articles_list = []

            quoted_loc = f'\"{search_loc}\"' if ' ' in search_loc else search_loc # noqa: W605
            if current_country_name:
                # Use the full country name for a more effective search
                location_query_part = f'({quoted_loc} AND \"{current_country_name}\")' # noqa: W605
            else:
                location_query_part = quoted_loc
            
            initial_q = f'{location_query_part} AND ({w_terms_q_part})'
            initial_params = {
                'q': initial_q, 'apiKey': news_api_key, 'sortBy': 'relevancy',
                'pageSize': 20, 'searchIn': 'title,description'
            }

            logger.info(f"--- NewsAPI Call (fetch_everything_news - Initial Query) ---")
            logger.info(f"URL: {url}")
            logger.info(f"Params: {initial_params}")
            try:
                r = requests.get(url, params=initial_params)
                r.raise_for_status()
                response_data = r.json()
                articles_list = response_data.get('articles', [])
                logger.info(f"Received {len(articles_list)} articles from initial query.")
                for i, article in enumerate(articles_list):
                    logger.info(f"  Initial Article {i} title: {article.get('title')}")

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    logger.warning("NewsAPI rate limit exceeded for 'everything' initial query.")
                else:
                    logger.error(f"HTTP Error fetching news from {url} with params {initial_params} (initial query): {e}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching news from {url} with params {initial_params} (initial query): {e}")
            if not articles_list:
                quoted_fallback_loc = f'\"{search_loc}\"' if ' ' in search_loc else search_loc
                fallback_q = f'{quoted_fallback_loc} AND ({w_terms_q_part})'
                fallback_params = {
                    'q': fallback_q, 'apiKey': news_api_key, 'sortBy': 'relevancy',
                    'pageSize': 20, 'searchIn': 'title,description'
                }
                logger.info(f"--- NewsAPI Call (fetch_everything_news - Fallback Query) ---")
                logger.info(f"URL: {url}")
                logger.info(f"Params: {fallback_params}")
                try:
                    r_fallback = requests.get(url, params=fallback_params)
                    r_fallback.raise_for_status()
                    response_data = r_fallback.json()
                    articles_list = response_data.get('articles', [])
                    logger.info(f"Received {len(articles_list)} articles from fallback query.")
                    for i, article in enumerate(articles_list):
                        logger.info(f"  Fallback Article {i} title: {article.get('title')}")

                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:
                        logger.warning("NewsAPI rate limit exceeded for 'everything' fallback query.")
                    else:
                        logger.error(f"HTTP Error fetching news from {url} with params {fallback_params} (fallback query): {e}")
                except requests.exceptions.RequestException as e:
                    logger.error(f"Error fetching news from {url} with params {fallback_params} (fallback query): {e}")
            return articles_list

        try:
            top_headlines_raw_articles = fetch_top_headlines_news_internal(location, weather_query_part_str, country_code)
            everything_articles = fetch_everything_news_internal(location, common_weather_terms, country_name)

            combined_articles_raw_list = []
            seen_urls_set = set()
            for article_list_to_combine in [top_headlines_raw_articles, everything_articles]:
                for article_to_combine in article_list_to_combine:
                    article_url = article_to_combine.get('url')
                    if article_url and article_url not in seen_urls_set:
                        combined_articles_raw_list.append(article_to_combine)
                        seen_urls_set.add(article_url)
            
            logger.info(f"--- Combined Raw Articles Before Filtering ({len(combined_articles_raw_list)} items) ---")
            filtered_articles = self._filter_weather_articles(combined_articles_raw_list)
            logger.info(f"--- Filtered Articles ({len(filtered_articles)} items) ---")

            if filtered_articles:
                serialized_articles_input = [
                    {
                        "title": article.get("title"),
                        "url": article.get("url"),
                        "publishedAt": article.get("publishedAt"),
                        "content": article.get("content") or article.get("description"),
                        "urlToImage": article.get("urlToImage")
                    }
                    for article in filtered_articles if article.get("title")
                ]
                serializer = NewsSerializer(data=serialized_articles_input, many=True)
                if serializer.is_valid():
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    logger.error(f"NewsSerializer errors: {serializer.errors}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response([], status=status.HTTP_200_OK)
        
        except requests.exceptions.HTTPError as http_err:
            if hasattr(http_err, 'response') and http_err.response is not None and http_err.response.status_code == 429:
                logger.warning("News API rate limit likely exceeded.")
                return Response({'error': 'News API request limit reached. Please try again later.'},
                                status=status.HTTP_429_TOO_MANY_REQUESTS)
            logger.error(f"HTTP error fetching news: {http_err}")
            logger.error(traceback.format_exc())
            return Response({"error": "An error occurred while fetching news (HTTP)."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request error fetching news: {req_err}")
            logger.error(traceback.format_exc())
            return Response({"error": "An error occurred while fetching news (Request)."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Exception in NewsView: {e}")
            logger.error(traceback.format_exc())
            return Response({"error": "An unexpected error occurred while fetching news."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
