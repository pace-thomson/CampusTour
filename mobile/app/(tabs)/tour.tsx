import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyticsService, Location, locationService, schoolService } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerMenu from '@/components/HamburgerMenu';

// Storage keys
const STORAGE_KEYS = {
  TOUR_STOPS: 'tourStops',
  SELECTED_INTERESTS: 'selectedInterests',
  SHOW_INTEREST_SELECTION: 'showInterestSelection',
  VISITED_LOCATIONS: 'visitedLocations',
  TOUR_STARTED: 'tourStarted',
  TOUR_FINISHED: 'tourFinished',
  LOCATION_PERMISSION_STATUS: 'locationPermissionStatus',
  CURRENT_LOCATION_ID: 'currentLocationId',
  LOCATION_ENTRY_TIMES: 'locationEntryTimes',
  PREVIOUSLY_ENTERED_LOCATIONS: 'previouslyEnteredLocations'
};

// Define the interface for a tour stop
type TourStop = Location;

// Define available interests
interface Interest {
  id: string;
  name: string;
}

// Static list of tour interests
const tourInterests: Interest[] = [
  { id: "science_and_labs", name: "🔬 Science & Labs" },
  { id: "engineering", name: "⚙️ Engineering" },
  { id: "business", name: "💼 Business" },
  { id: "computing", name: "💻 Computing" },
  { id: "arts_and_theater", name: "🎭 Arts & Theater" },
  { id: "music", name: "🎶 Music" },
  { id: "athletics", name: "🏟️ Athletics" },
  { id: "recreation_and_fitness", name: "🏋️ Recreation & Fitness" },
  { id: "dorm-life", name: "🛏️ Dorm Life" },
  { id: "campus-dining", name: "🍔 Campus Dining" },
  { id: "clubs", name: "🧑‍🤝‍🧑 Student Clubs" },
  { id: "library_and_study-spaces", name: "📚 Library & Study Spaces" },
  { id: "nature_and_outdoor-spots", name: "🌳 Nature & Outdoor Spots" },
  { id: "history_and_landmarks", name: "🏰 History & Landmarks" },
  { id: "health_and_wellness", name: "🩺 Health & Wellness" },
  { id: "faith_and_spirituality", name: "✝️ Faith & Spirituality" },
  { id: "community", name: "🤝 Community" },
  { id: "career-services", name: "🎓 Career Services" }
];

// Component for an individual tour stop item
const TourStopItem = ({ 
  item, 
  onDetailsPress, 
  onLocationPress,
  visited,
  onToggleVisited,
  primaryColor
}: { 
  item: TourStop; 
  onDetailsPress: (id: string) => void;
  onLocationPress: (id: string) => void;
  visited: boolean;
  onToggleVisited: (id: string) => void;
  primaryColor: string;
}) => {
  // Create dynamic styles with the primary color
  const dynamicStyles = {
    checkboxContainer: {
      borderColor: primaryColor
    },
    checkboxContainerChecked: {
      backgroundColor: primaryColor,
      borderColor: primaryColor
    },
    locationButton: {
      backgroundColor: primaryColor
    }
  };

  return (
    <View style={styles.tourStopCard}>
      {item.image ? (
        <Image 
          source={{ uri: item.image }} 
          style={styles.tourStopImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.tourStopImagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Building Image</Text>
        </View>
      )}
      <View style={styles.tourStopInfo}>
        <View style={styles.tourStopHeader}>
          <TouchableOpacity 
            style={[
              styles.checkboxContainer, 
              dynamicStyles.checkboxContainer,
              visited && dynamicStyles.checkboxContainerChecked
            ]} 
            onPress={() => onToggleVisited(item.id)}
          >
            {visited && <IconSymbol name="checkmark" size={14} color="white" />}
          </TouchableOpacity>
          <Text style={styles.tourStopName}>{item.name}</Text>
        </View>
        <Text style={styles.tourStopDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.tourStopButtons}>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => onDetailsPress(item.id)}
          >
            <IconSymbol name="info.circle.fill" size={12} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.locationButton, dynamicStyles.locationButton]}
            onPress={() => onLocationPress(item.id)}
          >
            <IconSymbol name="location.fill" size={12} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Interest tag component
const InterestTag = ({ 
  interest, 
  selected, 
  onPress,
  primaryColor
}: { 
  interest: Interest; 
  selected: boolean;
  onPress: () => void;
  primaryColor: string;
}) => {
  // Create dynamic styles with the primary color
  const dynamicStyles = {
    interestTagSelected: {
      backgroundColor: primaryColor
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.interestTag,
        selected && dynamicStyles.interestTagSelected
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          styles.interestTagText,
          selected && styles.interestTagTextSelected
        ]}
      >
        {interest.name}
      </Text>
    </TouchableOpacity>
  );
};

export default function TourScreen() {
  const router = useRouter();
  const [showInterestSelection, setShowInterestSelection] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000'); // Utah Tech red as fallback
  const [isGeneratingTour, setIsGeneratingTour] = useState<boolean>(false);
  
  // Location tracking and geofencing state
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [tourStarted, setTourStarted] = useState<boolean>(false);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [processingTourStart, setProcessingTourStart] = useState<boolean>(false);
  const [tourFinished, setTourFinished] = useState<boolean>(false);
  
  // Duration tracking state
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [locationEntryTimes, setLocationEntryTimes] = useState<{[locationId: string]: number}>({});
  const [previouslyEnteredLocations, setPreviouslyEnteredLocations] = useState<Set<string>>(new Set());


  // Get the selected school ID and details
  useEffect(() => {
    const getSelectedSchool = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      if (!selectedSchoolId) {
        // If no school is selected, redirect to the school selection screen
        router.replace('/');
        return;
      }
      
      setSchoolId(selectedSchoolId);
      
      // Get school details including primary color
      const schoolDetails = await schoolService.getSchoolById(selectedSchoolId);
      if (schoolDetails && schoolDetails.primary_color) {
        setPrimaryColor(schoolDetails.primary_color);
      }
    };

    getSelectedSchool();
  }, [router]);



  // Load saved state and fetch data when the component mounts
  useEffect(() => {
    const initializeTourData = async () => {
      if (!schoolId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch locations from Supabase
        const locationsData = await locationService.getLocations(schoolId);
        
        // Use static tour interests
        setAvailableInterests(tourInterests);
        
        // Now load saved state
        await loadSavedState();
      } catch (error) {
        console.error('Error initializing tour data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeTourData();
  }, [schoolId]);

  // Save state when it changes
  useEffect(() => {
    if (!isLoading) {
      saveTourState();
    }
  }, [showInterestSelection, selectedInterests, tourStops, visitedLocations, tourStarted, tourFinished, processingTourStart, locationPermissionStatus, currentLocationId, locationEntryTimes, previouslyEnteredLocations, isLoading]);

  // Load saved state from storage
  const loadSavedState = async () => {
    try {
      const savedShowInterestSelection = await AsyncStorage.getItem(STORAGE_KEYS.SHOW_INTEREST_SELECTION);
      const savedSelectedInterests = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_INTERESTS);
      const savedTourStops = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_STOPS);
      const savedVisitedLocations = await AsyncStorage.getItem(STORAGE_KEYS.VISITED_LOCATIONS);
      const savedTourStarted = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_STARTED);
      const savedTourFinished = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_FINISHED);
      const savedLocationPermissionStatus = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_PERMISSION_STATUS);
      const savedCurrentLocationId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_LOCATION_ID);
      const savedLocationEntryTimes = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_ENTRY_TIMES);
      const savedPreviouslyEnteredLocations = await AsyncStorage.getItem(STORAGE_KEYS.PREVIOUSLY_ENTERED_LOCATIONS);
      
      if (savedShowInterestSelection !== null) {
        setShowInterestSelection(JSON.parse(savedShowInterestSelection));
      }
      
      if (savedSelectedInterests !== null) {
        setSelectedInterests(JSON.parse(savedSelectedInterests));
      }
      
      if (savedTourStops !== null) {
        setTourStops(JSON.parse(savedTourStops));
      }

      if (savedVisitedLocations !== null) {
        setVisitedLocations(JSON.parse(savedVisitedLocations));
      }

      if (savedTourStarted !== null) {
        setTourStarted(JSON.parse(savedTourStarted));
      }

      if (savedTourFinished !== null) {
        setTourFinished(JSON.parse(savedTourFinished));
      }

      if (savedLocationPermissionStatus !== null) {
        setLocationPermissionStatus(savedLocationPermissionStatus);
      }

      if (savedCurrentLocationId !== null) {
        setCurrentLocationId(savedCurrentLocationId);
      }

      if (savedLocationEntryTimes !== null) {
        setLocationEntryTimes(JSON.parse(savedLocationEntryTimes));
      }

      if (savedPreviouslyEnteredLocations !== null) {
        const locationsArray = JSON.parse(savedPreviouslyEnteredLocations);
        setPreviouslyEnteredLocations(new Set(locationsArray));
      }
    } catch (error) {
      console.error('Error loading saved tour state:', error);
    }
  };

  // Save tour state to storage
  const saveTourState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_INTEREST_SELECTION, JSON.stringify(showInterestSelection));
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedInterests));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_STOPS, JSON.stringify(tourStops));
      await AsyncStorage.setItem(STORAGE_KEYS.VISITED_LOCATIONS, JSON.stringify(visitedLocations));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_STARTED, JSON.stringify(tourStarted));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_FINISHED, JSON.stringify(tourFinished));
      if (locationPermissionStatus) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION_STATUS, locationPermissionStatus);
      }
      if (currentLocationId) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LOCATION_ID, currentLocationId);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_ENTRY_TIMES, JSON.stringify(locationEntryTimes));
      await AsyncStorage.setItem(STORAGE_KEYS.PREVIOUSLY_ENTERED_LOCATIONS, JSON.stringify(Array.from(previouslyEnteredLocations)));
    } catch (error) {
      console.error('Error saving tour state:', error);
    }
  };

  // Get tour stops, optionally filtering by selected interests
  const getTourStops = async (filterByInterests = false): Promise<TourStop[]> => {
    if (!schoolId) return [];
    
    try {
      const allTourStops = await locationService.getTourStops(schoolId);
      
      if (!filterByInterests || selectedInterests.length === 0) {
        return allTourStops.filter(stop => stop.isTourStop);
      }
      
      // Filter by selected interests
      return allTourStops.filter(stop => 
        stop.interests.some(interest => 
          selectedInterests.includes(interest.toLowerCase().replace(/\s+/g, '-'))
        )
      );
    } catch (error) {
      console.error('Error getting tour stops:', error);
      return [];
    }
  };

  // Handle changing school
  const handleChangeSchool = async () => {
    await schoolService.clearSelectedSchool();
    router.replace('/');
  };

  // Toggle an interest
  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  // Generate tour based on selected interests
  const generateTour = async () => {
    setIsGeneratingTour(true); // Set loading state
    
    try {
      // Export analytics event for interests chosen
      if (schoolId && selectedInterests.length > 0) {
        // Convert interest IDs back to display names for metadata
        const selectedInterestNames = selectedInterests.map(interestId => {
          const interest = availableInterests.find(i => i.id === interestId);
          return interest ? interest.name : interestId;
        });
        
        await analyticsService.exportInterestsChosen(schoolId, selectedInterestNames);
      }
      
      // Call server endpoint to generate tour
      if (!schoolId || selectedInterests.length === 0) {
        console.log('❌ Falling back to local generation because:');

        // Fall back to local filtering if no school or no interests
        const filteredTourStops = await getTourStops(true);
        setTourStops(filteredTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
        return;
      }

      // Convert interest IDs back to display names for the API call
      const selectedInterestNames = selectedInterests.map(interestId => {
        const interest = availableInterests.find(i => i.id === interestId);
        return interest ? interest.name : interestId;
      });

      const requestBody = {
        school_id: schoolId,
        interests: selectedInterestNames
      };


      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for AI processing

      const response = await fetch('https://campustourbackend.onrender.com/generate-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`);
      }

      const tourLocationIds = await response.json();
      console.log('✅ Server returned tour location IDs:', tourLocationIds);

      // Get all locations for the school
      const allLocations = await locationService.getTourStops(schoolId);
      
      // Filter locations to only include those returned by the server, in the order returned
      const orderedTourStops = tourLocationIds
        .map((locationId: string) => allLocations.find((location: Location) => location.id === locationId))
        .filter((location: Location | undefined): location is Location => location !== undefined); // Remove any undefined results

      
      setTourStops(orderedTourStops);
      setShowInterestSelection(false);
      setIsGeneratingTour(false);
    } catch (error) {
      // Log error message without the full HTML content
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error generating tour:', errorMessage);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ Server request timed out (AI processing takes longer than 90 seconds)');
        console.log('🔄 The server might still be processing your request in the background');
      }
      
      // Fall back to local filtering if server call fails
      console.log('🔄 Falling back to local tour generation');
      try {
        const filteredTourStops = await getTourStops(true);
        setTourStops(filteredTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
        console.log('✅ Local tour generation completed as fallback');
      } catch (fallbackError) {
        console.error('❌ Error with fallback tour generation:', fallbackError);
        // If everything fails, show default tour
        console.log('🔄 Falling back to default tour');
        const defaultTourStops = await getTourStops(false);
        setTourStops(defaultTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
      }
    }
  };

  // Show default tour
  const showDefaultTour = async () => {
    const defaultTourStops = await getTourStops(false);
    setTourStops(defaultTourStops);
    setShowInterestSelection(false);
  };

  // Reset tour function - also reset tour started status
  const resetTour = () => {
    setShowInterestSelection(true);
    setSelectedInterests([]);
    setTourStops([]);
    setVisitedLocations([]);
    setTourStarted(false);
    setTourFinished(false);
    setProcessingTourStart(false);
    setCurrentLocationId(null);
    setLocationEntryTimes({});
    setPreviouslyEnteredLocations(new Set());
    stopLocationTracking();
  };

  // Toggle the visited status of a location
  const toggleVisited = (locationId: string) => {
    if (visitedLocations.includes(locationId)) {
      setVisitedLocations(visitedLocations.filter(id => id !== locationId));
    } else {
      const newVisitedLocations = [...visitedLocations, locationId];
      setVisitedLocations(newVisitedLocations);
      
      // Check if tour is now complete
      checkTourCompletion(newVisitedLocations);
    }
  };

  // Check if all tour stops have been visited
  const checkTourCompletion = async (currentVisitedLocations: string[]) => {
    if (!schoolId || tourFinished || tourStops.length === 0) {
      return;
    }

    // Check if all tour stops have been visited
    const allStopsVisited = tourStops.every(stop => currentVisitedLocations.includes(stop.id));

    if (allStopsVisited) {
      console.log('All tour stops completed! Exporting tour-finish event...');
      
      try {
        const stopNames = tourStops.map(stop => stop.name);
        await analyticsService.exportTourFinish(schoolId, tourStops.length, stopNames);
        setTourFinished(true);
        console.log('Tour finished event exported successfully');
      } catch (error) {
        console.error('Error exporting tour-finish event:', error);
      }
    }
  };

  // Handle the "Details" button press
  const handleDetailsPress = (buildingId: string) => {
    router.push({
      pathname: '/building/[id]',
      params: { id: buildingId }
    });
  };

  // Handle the "Location" button press
  const handleLocationPress = (buildingId: string) => {
    router.push({
      pathname: '/map',
      params: { building: buildingId }
    });
  };

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        await startLocationTracking();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  // Start location tracking for geofencing
  const startLocationTracking = async () => {
    try {
      // Get initial location
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Start watching location changes
      const watcher = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          timeInterval: 5000, // Check every 5 seconds
          distanceInterval: 10 // Only update if moved 10 meters
        },
        (newLocation) => {
          setUserLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          });
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  };

  // Check if user is within geofence of any tour stop and handle entry/exit
  const checkGeofences = async () => {
    if (!userLocation || !schoolId || tourStops.length === 0) {
      return;
    }

    let userIsAtAnyLocation = false;
    let newCurrentLocationId = null;

    // Check all tour stops to see if user is within any geofence
    for (const stop of tourStops) {
      const isWithin = analyticsService.isWithinGeofence(
        userLocation.latitude,
        userLocation.longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude
      );

      if (isWithin) {
        userIsAtAnyLocation = true;
        newCurrentLocationId = stop.id;

        // Check if this is a new location entry
        if (currentLocationId !== stop.id) {
          // User entered a new location
          console.log(`User entered geofence for: ${stop.name}`);
          
          // Record entry time
          const entryTime = Date.now();
          setLocationEntryTimes(prev => ({
            ...prev,
            [stop.id]: entryTime
          }));
          
          setPreviouslyEnteredLocations(prev => new Set([...prev, stop.id]));

          // Export tour-start event if this is the first location and tour hasn't started
          if (!tourStarted && !processingTourStart) {
            setProcessingTourStart(true);
            try {
              await analyticsService.exportTourStart(schoolId, stop.id, stop.name);
              setTourStarted(true);
              console.log('Tour started event exported successfully');
            } catch (error) {
              console.error('Error exporting tour start event:', error);
              setProcessingTourStart(false);
            }
          }
        }
        break; // User can only be at one location at a time
      }
    }

    // Handle location exit
    if (currentLocationId && (!userIsAtAnyLocation || newCurrentLocationId !== currentLocationId)) {
      // User has left the current location
      const exitedLocation = tourStops.find(stop => stop.id === currentLocationId);
      if (exitedLocation && locationEntryTimes[currentLocationId]) {
        const exitTime = Date.now();
        const entryTime = locationEntryTimes[currentLocationId];
        const durationMs = exitTime - entryTime;
        const durationSeconds = Math.round(durationMs / 1000);

        console.log(`User left ${exitedLocation.name} after ${durationSeconds} seconds`);

        // Export duration event
        try {
          await analyticsService.exportLocationDuration(
            schoolId, 
            currentLocationId, 
            exitedLocation.name, 
            durationSeconds
          );
          console.log(`Location duration event exported for ${exitedLocation.name}: ${durationSeconds}s`);
        } catch (error) {
          console.error('Error exporting location duration event:', error);
        }

        // Clean up entry time for this location
        setLocationEntryTimes(prev => {
          const newEntryTimes = { ...prev };
          delete newEntryTimes[currentLocationId];
          return newEntryTimes;
        });
      }
    }

    // Update current location
    setCurrentLocationId(newCurrentLocationId);
  };

  // Effect to handle location tracking when tour is active
  useEffect(() => {
    if (!showInterestSelection && tourStops.length > 0 && !tourStarted) {
      // Tour is active but not started yet - request location permission and start tracking
      if (locationPermissionStatus !== 'granted') {
        requestLocationPermission();
      } else {
        startLocationTracking();
      }
    }

    // Cleanup on unmount or when tour ends
    return () => {
      stopLocationTracking();
    };
  }, [showInterestSelection, tourStops, locationPermissionStatus]);

  // Effect to check geofences when user location changes
  useEffect(() => {
    if (userLocation) {
      checkGeofences();
    }
  }, [userLocation, tourStops, tourStarted, processingTourStart, currentLocationId, locationEntryTimes]);

  // Create dynamic styles with the primary color
  const dynamicStyles = {
    headerBorder: {
      borderBottomColor: primaryColor
    },
    generateTourButton: {
      backgroundColor: primaryColor
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <Text style={styles.headerText}>Campus Tour</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your tour...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} />
        <Text style={styles.headerText}>Campus Tour</Text>
        {!showInterestSelection && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTour}
          >
            <Text style={styles.resetButtonText}>New Tour</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showInterestSelection ? (
        <View style={styles.interestSelectionContainer}>
          <Text style={styles.interestSelectionText}>Select Your Interests</Text>
          <ScrollView style={styles.interestScrollContainer} contentContainerStyle={styles.interestScrollContent}>
            <View style={styles.interestTagsContainer}>
              {availableInterests.map(interest => (
                <InterestTag
                  key={interest.id}
                  interest={interest}
                  selected={selectedInterests.includes(interest.id)}
                  onPress={() => toggleInterest(interest.id)}
                  primaryColor={primaryColor}
                />
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity 
            style={[
              styles.generateTourButton,
              dynamicStyles.generateTourButton,
              (selectedInterests.length === 0 || isGeneratingTour) && styles.generateTourButtonDisabled
            ]}
            onPress={generateTour}
            disabled={selectedInterests.length === 0 || isGeneratingTour}
          >
            <Text style={styles.buttonText}>
              {isGeneratingTour ? 'Generating Tour with AI...' : 'Generate Tour'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showDefaultTour} disabled={isGeneratingTour}>
            <Text style={[styles.skipText, isGeneratingTour && styles.skipTextDisabled]}>
              {isGeneratingTour ? 'Please wait...' : 'Skip to Default Tour'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tourStops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourStopItem 
              item={item}
              onDetailsPress={handleDetailsPress}
              onLocationPress={handleLocationPress}
              visited={visitedLocations.includes(item.id)}
              onToggleVisited={toggleVisited}
              primaryColor={primaryColor}
            />
          )}
          style={styles.tourList}
          contentContainerStyle={styles.tourListContent}
          ListHeaderComponent={
            <View style={styles.tourHeaderContainer}>
              <Text style={styles.tourHeaderText}>Your Tour</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyTourContainer}>
              <Text style={styles.emptyTourText}>No buildings match your selected interests.</Text>
              <TouchableOpacity 
                style={[styles.generateTourButton, dynamicStyles.generateTourButton]}
                onPress={resetTour}
              >
                <Text style={styles.buttonText}>Select Different Interests</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 15,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  interestSelectionContainer: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    height: '82%',
  },
  interestSelectionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interestScrollContainer: {
    width: '100%',
    backgroundColor: '#D3D3D3',
    borderRadius: 16,
  },
  interestScrollContent: {
    paddingVertical: 8,
  },
  interestTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  interestTag: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 14,
    color: '#333333',
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
  },
  generateTourButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateTourButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  skipText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  skipTextDisabled: {
    color: '#CCCCCC',
    opacity: 0.5,
  },
  tourList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tourListContent: {
    paddingBottom: 50, // Adjust this value based on the height of the tab bar
  },
  tourHeaderContainer: {
    paddingVertical: 6,
    marginBottom: 15,
  },
  tourHeaderText: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  emptyTourContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTourText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  tourStopCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    overflow: 'hidden',
  },
  tourStopImage: {
    width: 100,
    backgroundColor: '#DDDDDD',
  },
  tourStopImagePlaceholder: {
    width: 100,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  tourStopInfo: {
    flex: 1,
    padding: 12,
  },
  tourStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tourStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  tourStopDescription: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 12,
  },
  tourStopButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailsButton: {
    backgroundColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
