import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { Picker } from '@react-native-picker/picker'; // Bỏ Picker cũ
import DropDownPicker from 'react-native-dropdown-picker';

// Định nghĩa kiểu cho item địa điểm (tỉnh, huyện, xã)
type LocationItem = {
  id: string;
  full_name: string;
  // Thêm các trường này để DropDownPicker sử dụng trực tiếp
  label?: string;
  value?: string;
};

type UserProfileData = {
  full_name: string;
  // email?: string; // Email thường không cho phép sửa hoặc cần quy trình xác minh riêng
  // Thêm các trường khác nếu bạn muốn cho phép sửa, ví dụ: phone_number
};

// Cập nhật AddressData để lưu trữ thông tin chi tiết hơn
type AddressData = {
  street: string;
  province_id: string | null;
  province_name: string | null;
  district_id: string | null;
  district_name: string | null;
  ward_id: string | null;
  ward_name: string | null;
};

// Kiểu dữ liệu cho địa chỉ hiện tại từ ProfileScreen (để mapping nếu có thể)
type OldAddressData = {
  street: string;
  city: string; // Sẽ được map (nếu có thể) hoặc người dùng chọn mới
  country: string; // Sẽ được map (nếu có thể) hoặc người dùng chọn mới
  zip_code: string; // Sẽ được map (nếu có thể) hoặc người dùng chọn mới
};

type EditProfileModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (profileData: UserProfileData, addressData: AddressData) => void;
  currentUser: {
    full_name?: string;
    email?: string;
  } | null;
  currentAddress: OldAddressData | null; // Sử dụng OldAddressData ở đây
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isVisible,
  onClose,
  onSave,
  currentUser,
  currentAddress,
}) => {
  const [fullName, setFullName] = useState('');
  // const [email, setEmail] = useState(''); // Xem xét việc cho phép sửa email

  const [street, setStreet] = useState('');

  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);

  const [openProvincePicker, setOpenProvincePicker] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const [openDistrictPicker, setOpenDistrictPicker] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const [openWardPicker, setOpenWardPicker] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  // Helper function (can be outside component if it doesn't use hooks/props, or memoized if needed)
  const mapToPickerItems = (
    items: LocationItem[],
  ): Array<{ label: string; value: string }> => {
    return items.map((item) => ({ label: item.full_name, value: item.id }));
  };

  // Memoized items for pickers
  const mappedProvinces = useMemo(
    () => mapToPickerItems(provinces),
    [provinces],
  );
  const mappedDistricts = useMemo(
    () => mapToPickerItems(districts),
    [districts],
  );
  const mappedWards = useMemo(() => mapToPickerItems(wards), [wards]);

  // Define fetch functions before the main useEffect that uses fetchProvinces
  const fetchProvinces = useCallback(async () => {
    setIsLoadingProvinces(true);
    try {
      const response = await fetch('https://esgoo.net/api-tinhthanh/1/0.htm');
      const data = await response.json();
      if (data.error === 0 && data.data) {
        setProvinces(data.data);
      } else {
        console.error('Lỗi tải tỉnh thành:', data.message);
        setProvinces([]);
      }
    } catch (error) {
      console.error('Lỗi mạng khi tải tỉnh thành:', error);
      setProvinces([]);
    } finally {
      setIsLoadingProvinces(false);
    }
  }, []); // Empty dependency array: function doesn't depend on props/state

  const fetchDistricts = useCallback(async (provinceId: string | null) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    setIsLoadingDistricts(true);
    setWards([]); // Clear subsequent picker data when starting a new fetch
    try {
      const response = await fetch(
        `https://esgoo.net/api-tinhthanh/2/${provinceId}.htm`,
      );
      const data = await response.json();
      if (data.error === 0 && data.data) {
        setDistricts(data.data);
      } else {
        console.error('Lỗi tải quận huyện:', data.message);
        setDistricts([]);
      }
    } catch (error) {
      console.error('Lỗi mạng khi tải quận huyện:', error);
      setDistricts([]);
    } finally {
      setIsLoadingDistricts(false);
    }
  }, []);

  const fetchWards = useCallback(async (districtId: string | null) => {
    if (!districtId) {
      setWards([]);
      return;
    }
    setIsLoadingWards(true);
    try {
      const response = await fetch(
        `https://esgoo.net/api-tinhthanh/3/${districtId}.htm`,
      );
      const data = await response.json();
      if (data.error === 0 && data.data) {
        setWards(data.data);
      } else {
        console.error('Lỗi tải phường xã:', data.message);
        setWards([]);
      }
    } catch (error) {
      console.error('Lỗi mạng khi tải phường xã:', error);
      setWards([]);
    } finally {
      setIsLoadingWards(false);
    }
  }, []);

  // Main useEffect for initialization and visibility changes
  useEffect(() => {
    if (isVisible) {
      if (currentUser) {
        setFullName(currentUser.full_name || '');
      }
      if (currentAddress) {
        setStreet(currentAddress.street || '');
      }
      setSelectedProvince(null);
      setSelectedDistrict(null);
      setSelectedWard(null);
      setDistricts([]);
      setWards([]);
      setOpenProvincePicker(false);
      setOpenDistrictPicker(false);
      setOpenWardPicker(false);
      fetchProvinces();
    } else {
      setProvinces([]);
      setDistricts([]);
      setWards([]);
      setSelectedProvince(null);
      setSelectedDistrict(null);
      setSelectedWard(null);
      setOpenProvincePicker(false);
      setOpenDistrictPicker(false);
      setOpenWardPicker(false);
    }
  }, [currentUser, currentAddress, isVisible, fetchProvinces]);

  // Effect for handling province selection changes
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
    }
    setSelectedDistrict(null);
    setOpenDistrictPicker(false);
  }, [selectedProvince, fetchDistricts]);

  // Effect for handling district selection changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict);
    } else {
      setWards([]);
    }
    setSelectedWard(null);
    setOpenWardPicker(false);
  }, [selectedDistrict, fetchWards]);

  const handleSaveChanges = () => {
    const profileData: UserProfileData = {
      full_name: fullName,
    };

    const provinceName =
      provinces.find((p) => p.id === selectedProvince)?.full_name || null;
    const districtName =
      districts.find((d) => d.id === selectedDistrict)?.full_name || null;
    const wardName =
      wards.find((w) => w.id === selectedWard)?.full_name || null;

    const addressData: AddressData = {
      street,
      province_id: selectedProvince,
      province_name: provinceName,
      district_id: selectedDistrict,
      district_name: districtName,
      ward_id: selectedWard,
      ward_name: wardName,
    };
    onSave(profileData, addressData);
  };

  // Đóng các picker khác khi một picker được mở
  const onProvinceOpen = useCallback(() => {
    setOpenDistrictPicker(false);
    setOpenWardPicker(false);
  }, []);

  const onDistrictOpen = useCallback(() => {
    setOpenProvincePicker(false);
    setOpenWardPicker(false);
  }, []);

  const onWardOpen = useCallback(() => {
    setOpenProvincePicker(false);
    setOpenDistrictPicker(false);
  }, []);

  return (
    <Modal
      animationType='slide'
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // Dành cho nút back Android
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.headerText}>Chỉnh sửa thông tin</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons
                      name='close-circle-outline'
                      size={28}
                      color='#555'
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Họ và tên đầy đủ'
                    value={fullName}
                    onChangeText={setFullName}
                    placeholderTextColor='#888'
                  />
                  {/* <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    // editable={false} // Cân nhắc không cho sửa email trực tiếp
                    placeholderTextColor="#888"
                  /> */}

                  <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Số nhà, tên đường'
                    value={street}
                    onChangeText={setStreet}
                    placeholderTextColor='#888'
                  />

                  <DropDownPicker
                    listMode={Platform.OS === 'ios' ? 'SCROLLVIEW' : 'MODAL'}
                    open={openProvincePicker}
                    value={selectedProvince}
                    items={mappedProvinces}
                    setOpen={setOpenProvincePicker}
                    setValue={setSelectedProvince}
                    onOpen={onProvinceOpen}
                    loading={isLoadingProvinces}
                    placeholder='Chọn Tỉnh/Thành phố'
                    disabled={isLoadingProvinces}
                    style={styles.dropdownPicker}
                    placeholderStyle={styles.dropdownPlaceholder}
                    dropDownContainerStyle={styles.dropdownContainer}
                    listItemLabelStyle={styles.dropdownListItemLabel}
                    selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
                    selectedItemContainerStyle={
                      styles.dropdownSelectedItemContainer
                    }
                    arrowIconStyle={styles.dropdownArrowIcon}
                    tickIconStyle={styles.dropdownTickIcon}
                    zIndex={3000}
                    zIndexInverse={1000}
                  />

                  <DropDownPicker
                    listMode={Platform.OS === 'ios' ? 'SCROLLVIEW' : 'MODAL'}
                    open={openDistrictPicker}
                    value={selectedDistrict}
                    items={mappedDistricts}
                    setOpen={setOpenDistrictPicker}
                    setValue={setSelectedDistrict}
                    onOpen={onDistrictOpen}
                    loading={isLoadingDistricts}
                    placeholder='Chọn Quận/Huyện'
                    disabled={
                      !selectedProvince ||
                      isLoadingDistricts ||
                      districts.length === 0
                    }
                    style={styles.dropdownPicker}
                    placeholderStyle={styles.dropdownPlaceholder}
                    dropDownContainerStyle={styles.dropdownContainer}
                    listItemLabelStyle={styles.dropdownListItemLabel}
                    selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
                    selectedItemContainerStyle={
                      styles.dropdownSelectedItemContainer
                    }
                    arrowIconStyle={styles.dropdownArrowIcon}
                    tickIconStyle={styles.dropdownTickIcon}
                    zIndex={2000}
                    zIndexInverse={2000}
                  />

                  <DropDownPicker
                    listMode={Platform.OS === 'ios' ? 'SCROLLVIEW' : 'MODAL'}
                    open={openWardPicker}
                    value={selectedWard}
                    items={mappedWards}
                    setOpen={setOpenWardPicker}
                    setValue={setSelectedWard}
                    onOpen={onWardOpen}
                    loading={isLoadingWards}
                    placeholder='Chọn Phường/Xã'
                    disabled={
                      !selectedDistrict || isLoadingWards || wards.length === 0
                    }
                    style={styles.dropdownPicker}
                    placeholderStyle={styles.dropdownPlaceholder}
                    dropDownContainerStyle={styles.dropdownContainer}
                    listItemLabelStyle={styles.dropdownListItemLabel}
                    selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
                    selectedItemContainerStyle={
                      styles.dropdownSelectedItemContainer
                    }
                    arrowIconStyle={styles.dropdownArrowIcon}
                    tickIconStyle={styles.dropdownTickIcon}
                    zIndex={1000}
                    zIndexInverse={3000}
                  />
                </ScrollView>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveChanges}
                >
                  <Text style={styles.saveButtonText}>LƯU THAY ĐỔI</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)', // Nền mờ
  },
  content: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    maxHeight: '85%', // Giới hạn chiều cao của phần nội dung
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  dropdownPicker: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  dropdownPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownListItemLabel: {
    color: '#333',
    fontSize: 16,
  },
  dropdownSelectedItemLabel: {
    fontWeight: 'bold',
  },
  dropdownSelectedItemContainer: {
    backgroundColor: '#e0e0e0',
  },
  dropdownArrowIcon: {},
  dropdownTickIcon: {},
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileModal;
