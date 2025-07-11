import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { userTypeService, UserType, schoolService } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TourTypeSelectionScreen() {
  const [selectedTourType, setSelectedTourType] = useState<UserType>(null);
  const router = useRouter();

  const handleTourTypeSelect = (tourType: UserType) => {
    setSelectedTourType(tourType);
  };

  const handleContinue = async () => {
    if (selectedTourType) {
      // Store the selected tour type using the service
      await userTypeService.setUserType(selectedTourType);
      
      if (selectedTourType === 'self-guided') {
        router.push('/school-selection');
      } else {
        // For ambassador-led, go directly to school selection for now
        router.push('/school-selection');
      }
    }
  };

  const handleAmbassadorAction = async () => {
    // Set user type as ambassador using the service
    await userTypeService.setUserType('ambassador');
    
    // Navigate directly to school selection for ambassadors
    router.push('/school-selection');
  };

    //  This is just here for testing purposes
  const skipToMap = async () => {
    await userTypeService.setUserType('self-guided');
    await schoolService.setSelectedSchool('e5a9dfd2-0c88-419e-b891-0a62283b8abd');
    router.push('/map');
  };

  const clearAsyncStorage = async () => {
    await AsyncStorage.clear();
    console.log('Async Storage cleared');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Ambassador button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.ambassadorButton} onPress={handleAmbassadorAction}>
          <Text style={styles.ambassadorButtonText}>Ambassador</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipToMapButton} onPress={skipToMap}>
          <Text>Skip to map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipToMapButton} onPress={clearAsyncStorage}>
          <Text>Clear Async Storage</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Image */}
      <Image 
        style={styles.heroImage} 
        source={{ uri: "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" }}
      />

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Choose your tour type</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.tourTypeButton, 
              selectedTourType === 'self-guided' && styles.selectedButton
            ]} 
            onPress={() => handleTourTypeSelect('self-guided')}
          >
            <Text style={[
              styles.tourTypeButtonText,
              selectedTourType === 'self-guided' && styles.selectedButtonText
            ]}>
              Self-Guided
            </Text>
            <Text style={[
              styles.tourTypeDescription,
              selectedTourType === 'self-guided' && styles.selectedDescriptionText
            ]}>
              Explore at your own pace with interactive maps and audio guides
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tourTypeButton, 
              selectedTourType === 'ambassador-led' && styles.selectedButton
            ]} 
            onPress={() => handleTourTypeSelect('ambassador-led')}
          >
            <Text style={[
              styles.tourTypeButtonText,
              selectedTourType === 'ambassador-led' && styles.selectedButtonText
            ]}>
              Ambassador-Led
            </Text>
            <Text style={[
              styles.tourTypeDescription,
              selectedTourType === 'ambassador-led' && styles.selectedDescriptionText
            ]}>
              Join a guided tour with a student ambassador
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.continueButton, !selectedTourType && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={!selectedTourType}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  ambassadorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ambassadorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  heroImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#fff',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  tourTypeButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
  },
  tourTypeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  selectedButtonText: {
    color: '#fff',
  },
  tourTypeDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedDescriptionText: {
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
  },
  continueButtonText: {
    color: '#282828',
    fontSize: 18,
    fontWeight: 'bold',
  },
  //  This is just here for testing purposes
  skipToMapButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    alignSelf: 'flex-start',
  },
}); 