import React, { useEffect, useState, useRef } from 'react';
import { Polygon } from 'react-native-maps';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Alert } from 'react-native';
import { Polyline } from 'react-native-maps';
import { polygon, area, length } from '@turf/turf';
import {
  faLayerGroup,
  faLocationCrosshairs,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import styles from './PointAddingScreenStyles';
import MapView, { MAP_TYPES } from 'react-native-maps';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import { captureRef } from 'react-native-view-shot';
import axios from 'axios';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PointAddingScreen = ({ navigation, route }) => {
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [isPolygonComplete, setIsPolygonComplete] = useState(false);
  const [region, setRegion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [points, setPoints] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapTypeIndex, setMapTypeIndex] = useState(0);
  const [showCurrentLocation, setShowCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef = React.useRef(null);
  const viewShotRef = useRef(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchedMarker, setSearchedMarker] = useState(null);

  const handlePlaceSelect = (data, details = null) => {
    if (details) {
      const { lat, lng } = details.geometry.location;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      mapRef.current.animateToRegion(newRegion);

      setSearchedMarker({
        latitude: lat,
        longitude: lng,
      });
    }
  };
  const getLocationName = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const addressComponents = data.results[0].address_components;
        const city = addressComponents.find(
          (component) =>
            component.types.includes('locality') ||
            component.types.includes('administrative_area_level_2')
        );
        const country = addressComponents.find((component) =>
          component.types.includes('country')
        );
        if (city && country) {
          return `${city.long_name}, ${country.long_name}`;
        }
      }
      return '';
    } catch (error) {
      console.error('Error getting location name:', error);
      return '';
    }
  };

  const uploadToImgbb = async (imageUri) => {
    const apiKey = 'a08fb8cde558efecce3f05b7f97d4ef7';
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'map_image.jpg',
    });

    try {
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data.url;
    } catch (error) {
      console.error('Error uploading image to imgbb:', error);
      throw error;
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };
  const selectMapType = (index) => {
    setMapTypeIndex(index);
    setShowDropdown(false);
  };
  const focusOnCurrentLocation = () => {
    setSearchedLocation(null);
    setShowCurrentLocation((prevShowCurrentLocation) => {
      const newShowCurrentLocation = !prevShowCurrentLocation;
      if (newShowCurrentLocation && currentLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0005,
          longitudeDelta: 0.0005,
        });
        setShowUserLocation(true);
      }
      return newShowCurrentLocation;
    });
  };
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0005,
        longitudeDelta: 0.0005,
      });
      setCurrentLocation(location);
      setLoading(false);
    })();
  }, []);

  const handleClearPoints = () => {
    setPoints([]);
    setIsPolygonComplete(false);
  };
  const handleCompleteMap = () => {
    if (points.length > 2) {
      setIsPolygonComplete(true);
    } else {
      alert('You need at least 3 points to complete a polygon');
    }
  };
  const handleUndoLastPoint = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
    }
  };
  const handleSaveMap = async () => {
    try {
      setIsSaving(true);
      if (points.length < 3) {
        alert('You need at least 3 points to calculate area and perimeter');
        setIsSaving(false);
        return;
      }

      let imageUrl = '';
      if (mapRef.current) {
        const uri = await captureRef(mapRef.current, {
          format: 'jpg',
          quality: 0.3,
        });
        console.log('Captured image URI:', uri);
        imageUrl = await uploadToImgbb(uri);
        console.log('Uploaded image URL:', imageUrl);
      }

      const formattedPoints = points.map((point) => [
        point.longitude,
        point.latitude,
      ]);
      formattedPoints.push(formattedPoints[0]);

      const poly = polygon([formattedPoints]);
      const areaMeters = area(poly);
      const perimeterMeters = length(poly, { units: 'meters' });
      const areaPerches = areaMeters / 25.29285264;
      const perimeterKilometers = perimeterMeters / 1000;
      setIsSaving(false);

      Alert.alert(
        'Confirmation',
        `Area: ${areaPerches.toFixed(
          2
        )} perches, Perimeter: ${perimeterKilometers.toFixed(2)} kilometers`,
        [
          {
            text: 'Cancel',
            onPress: () => setPoints([]),
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('SaveScreen', {
                locationPoints: points,
                area: areaPerches,
                perimeter: perimeterKilometers,
                imageUrl,
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error saving map:', error);
      alert('An error occurred while saving the map. Please try again.');
      setIsSaving(false);
    }
  };

  const handleSetMapType = (type) => {
    setMapType(type);
    setModalVisible(false);
  };

  const handleCancel = () => {
    navigation.navigate('Home');
  };
  const mapTypes = [
    { name: 'Satellite', value: 'satellite' },
    { name: 'Standard', value: 'standard' },
    { name: 'Hybrid', value: 'hybrid' },
    { name: 'Terrain', value: 'terrain' },
  ];

  const toggleMapType = () => {
    setShowDropdown(!showDropdown);
  };
  const onFocus = () => {
    setIsFocused(true);
  };
  const onBlur = () => {
    setIsFocused(false);
  };

  const searchLocation = async () => {
    if (searchQuery) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setShowCurrentLocation(false);
          setSearchedLocation({ latitude: lat, longitude: lng });
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        } else {
          console.error('Location not found');
        }
      } catch (error) {
        console.error('Error searching for location:', error);
      }
    }
  };

  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  return (
    <>
      {loading ? (
        <View style={styles.loadingScreen}>
          <View style={styles.dotsWrapper}>
            <ActivityIndicator color="#007BFF" size={45} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <GooglePlacesAutocomplete
            placeholder="Search Location"
            onPress={handlePlaceSelect}
            fetchDetails={true}
            query={{
              key: apiKey,
              language: 'en',
            }}
            styles={{
              container: styles.searchBarContainer,
              textInputContainer: styles.searchBarInputContainer,
              textInput: styles.searchBarInput,
            }}
            renderRightButton={() => (
              <TouchableOpacity
                onPress={() => {
                  this.googlePlacesAutocomplete.clear();
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
            ref={(instance) => {
              this.googlePlacesAutocomplete = instance;
            }}
          />

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeModal}
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <TouchableOpacity
                    style={styles.btnStyle}
                    onPress={() => handleSetMapType(MAP_TYPES.SATELLITE)}
                  >
                    <Text style={styles.btmBtnStyle}>Satellite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnStyle}
                    onPress={() => handleSetMapType(MAP_TYPES.STANDARD)}
                  >
                    <Text style={styles.btmBtnStyle}>Standard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnStyle}
                    onPress={() => handleSetMapType(MAP_TYPES.HYBRID)}
                  >
                    <Text style={styles.btmBtnStyle}>Hybrid</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <View style={{ flex: 1 }}>
            {region && (
              <View style={{ flex: 1 }}>
                <MapView
                  ref={mapRef}
                  style={styles.mapViewStyling}
                  region={region}
                  showsUserLocation={showUserLocation}
                  onUserLocationChange={(event) => {
                    const { latitude, longitude } =
                      event.nativeEvent.coordinate;
                    setRegion({
                      ...region,
                      latitude: event.nativeEvent.coordinate.latitude,
                      longitude: event.nativeEvent.coordinate.longitude,
                    });
                    setCurrentLocation({ coords: { latitude, longitude } });
                  }}
                  mapType={mapTypes[mapTypeIndex].value}
                  onPress={(event) => {
                    if (!isButtonPressed) {
                      setPoints([...points, event.nativeEvent.coordinate]);
                    }
                  }}
                  mapPadding={{ top: 0, right: -100, bottom: 0, left: 0 }}
                >
                  {points.map((point, index) => (
                    <Marker key={index} coordinate={point} />
                  ))}
                  {!isPolygonComplete && points.length > 1 && (
                    <Polyline
                      coordinates={points}
                      strokeColor="#000"
                      strokeWidth={1}
                    />
                  )}
                  {isPolygonComplete && points.length > 2 && (
                    <Polygon
                      coordinates={points}
                      strokeColor="#000"
                      fillColor="rgba(199, 192, 192, 0.5)"
                      strokeWidth={1}
                    />
                  )}
                  {searchedMarker && (
                    <Marker
                      coordinate={searchedMarker}
                      tracksViewChanges={false}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: 'red',
                          borderWidth: 1,
                          borderColor: 'white',
                        }}
                      />
                    </Marker>
                  )}
                </MapView>

                <TouchableOpacity
                  style={styles.layerIconContainer}
                  onPress={() => {
                    setIsButtonPressed(true);
                    toggleMapType();
                  }}
                >
                  <FontAwesomeIcon
                    icon={faLayerGroup}
                    size={responsiveFontSize(3)}
                    color="#fff"
                  />
                  {showDropdown && (
                    <View style={styles.dropdownContainer}>
                      <FlatList
                        data={mapTypes}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => selectMapType(index)}
                          >
                            <Text style={{ color: '#fff' }}>{item.name}</Text>
                          </TouchableOpacity>
                        )}
                        keyExtractor={(item) => item.value}
                      />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.locationFocusBtn}
                  onPress={focusOnCurrentLocation}
                >
                  <FontAwesomeIcon
                    icon={faLocationCrosshairs}
                    size={responsiveFontSize(3)}
                    color="#fff"
                  />
                </TouchableOpacity>
                <View>
                  <View style={styles.sideIconWrap}>
                    <TouchableWithoutFeedback
                      onPressIn={() => setIsButtonPressed(true)}
                      onPressOut={() => setIsButtonPressed(false)}
                    >
                      <MaterialCommunityIcons
                        name="arrow-u-left-top"
                        size={responsiveFontSize(3)}
                        color="white"
                        style={styles.sideIconStyle}
                        onPress={handleUndoLastPoint}
                      />
                    </TouchableWithoutFeedback>
                    <TouchableWithoutFeedback
                      onPressIn={() => setIsButtonPressed(true)}
                      onPressOut={() => setIsButtonPressed(false)}
                    >
                      <MaterialCommunityIcons
                        name="shape-polygon-plus"
                        size={responsiveFontSize(3)}
                        color="white"
                        style={styles.sideIconStyle}
                        onPress={handleCompleteMap}
                      />
                    </TouchableWithoutFeedback>
                  </View>
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.cancelBtnStyle}
                  >
                    <Text style={styles.btmBtnStyle}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveMap}
                    style={styles.btnStyle}
                  >
                    <Text style={styles.btmBtnStyle}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          {isSaving && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#007BFF" size={45} />
              <Text style={styles.loadingText}>Saving...</Text>
            </View>
          )}
        </View>
      )}
    </>
  );
};

export default PointAddingScreen;
