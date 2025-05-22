import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  Modal,
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatScreen from '../screens/ChatScreen';

const ChatPopUp = () => {
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Handle web-specific chat button position
  const chatButtonStyle = Platform.select({
    web: {
      position: 'absolute' as const,
      bottom: 100,
      right: 20,
      zIndex: 1000,
    },
    default: {
      position: 'absolute' as const,
      bottom: 100,
      right: 20,
      zIndex: 1000,
    },
  });
  return (
    <>
      <TouchableOpacity
        style={[styles.chatButton, chatButtonStyle]}
        onPress={() => setIsChatVisible(true)}
      >
        <Ionicons name='chatbubble-outline' size={24} color='white' />
      </TouchableOpacity>
      <Modal
        visible={isChatVisible}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setIsChatVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat</Text>
              <TouchableOpacity onPress={() => setIsChatVisible(false)}>
                <Ionicons name='close' size={24} color='white' />
              </TouchableOpacity>
            </View>
            <ChatScreen />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatButton: {
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#007bff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatPopUp;
