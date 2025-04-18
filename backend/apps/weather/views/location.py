from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from apps.weather.models.location import FavoriteLocation
from apps.weather.serializers.location import FavoriteLocationSerializer

class FavoriteLocationView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favorites = FavoriteLocation.objects.filter(user=request.user)
        serializer = FavoriteLocationSerializer(favorites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        city_name = request.data.get('city_name')
        country_code = request.data.get('country_code')
        latitude = request.data.get('latitude', None)
        longitude = request.data.get('longitude', None)

        existing_location = FavoriteLocation.objects.filter(
            user=request.user, 
            city_name=city_name, 
            country_code=country_code
        ).first()

        if existing_location:
            return Response(
                {'message': 'This location is already in your favorites.'}, 
                status=status.HTTP_200_OK
            )

        serializer = FavoriteLocationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({'message': 'Location added to favorites.'}, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        city_name = request.data.get('city_name')
        country_code = request.data.get('country_code')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if not city_name or not country_code or latitude is None or longitude is None:
            return Response({'error': 'City name, country code, latitude, and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)

        favorite = FavoriteLocation.objects.filter(
            user=request.user,
            city_name=city_name,
            country_code=country_code,
            latitude=latitude,
            longitude=longitude
        ).first()

        if favorite:
            favorite.delete()
            return Response({'message': f'{city_name} removed from favorites.'}, status=status.HTTP_200_OK)

        return Response({'error': f'{city_name} not found in favorites.'}, status=status.HTTP_404_NOT_FOUND)
