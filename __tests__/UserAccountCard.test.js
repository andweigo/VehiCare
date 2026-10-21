import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import UserAccountCard from '../src/components/UserAccountCard';

const mockCloseSidebar = jest.fn();
jest.mock('../src/context/SidebarContext', () => ({
  useSidebar: () => ({
    closeSidebar: mockCloseSidebar,
  }),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#0D0D0D',
      surface: '#151515',
      surfaceAlt: '#1C1C1E',
      border: '#292929',
      accent: '#F5501C',
      accentSoft: '#F5501C20',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      overlay: 'rgba(0,0,0,0.7)',
    },
    themeName: 'dark',
  }),
}));

const mockRootNavigate = jest.fn();
const mockHookNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockHookNavigate,
    getParent: () => ({
      navigate: mockRootNavigate,
      getParent: () => null,
    }),
  }),
}));

describe('UserAccountCard Navigation & Premium Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to ManagePlan and closes sidebar when tapping VehiCare Premium (Free plan)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          username="Test User"
          email="test@vehicare.com"
          plan="FREE"
        />
      );
    });

    const root = tree.root;

    // 1. Open the Account Menu Modal by tapping the card
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // 2. Find the Premium touchable row by searching for "VehiCare Premium"
    const textNodes = root.findAllByType(Text);
    const premiumTextNode = textNodes.find(t => t.props.children === 'VehiCare Premium');
    expect(premiumTextNode).toBeTruthy();

    // Find the enclosing TouchableOpacity for the premium row
    let current = premiumTextNode.parent;
    while (current && current.type !== TouchableOpacity) {
      current = current.parent;
    }
    expect(current).toBeTruthy();

    // 3. Tap the Premium row
    act(() => {
      current.props.onPress();
    });

    // Verify it traversed to root and navigated to ManagePlan (NOT Premium)
    expect(mockRootNavigate).toHaveBeenCalledWith('ManagePlan', undefined);
    expect(mockCloseSidebar).toHaveBeenCalled();
  });

  it('navigates to ManagePlan when user is on PREMIUM plan (Manage Subscription)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          username="Premium User"
          email="premium@vehicare.com"
          plan="PREMIUM"
        />
      );
    });

    const root = tree.root;

    // Open modal
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // Find "Manage Subscription"
    const textNodes = root.findAllByType(Text);
    const manageSubText = textNodes.find(t => t.props.children === 'Manage Subscription');
    expect(manageSubText).toBeTruthy();

    let current = manageSubText.parent;
    while (current && current.type !== TouchableOpacity) {
      current = current.parent;
    }

    act(() => {
      current.props.onPress();
    });

    expect(mockRootNavigate).toHaveBeenCalledWith('ManagePlan', undefined);
  });

  it('navigates to Profile correctly', () => {
    const mockPropNavigate = jest.fn();
    const mockPropNav = {
      navigate: mockPropNavigate,
      getParent: () => null,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          navigation={mockPropNav}
          username="Test Nav"
          email="testnav@vehicare.com"
          plan="FREE"
        />
      );
    });

    const root = tree.root;

    // Open modal
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // Test Profile
    const textNodes = root.findAllByType(Text);
    const profileText = textNodes.find(t => t.props.children === 'Profile');
    let profileBtn = profileText.parent;
    while (profileBtn && profileBtn.type !== TouchableOpacity) {
      profileBtn = profileBtn.parent;
    }
    act(() => {
      profileBtn.props.onPress();
    });
    expect(mockPropNavigate).toHaveBeenCalledWith('Profile', undefined);
  });

  it('navigates to Settings correctly', () => {
    const mockPropNavigate = jest.fn();
    const mockPropNav = {
      navigate: mockPropNavigate,
      getParent: () => null,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          navigation={mockPropNav}
          username="Test Nav"
          email="testnav@vehicare.com"
          plan="FREE"
        />
      );
    });

    const root = tree.root;

    // Open modal
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // Test Settings
    const textNodes = root.findAllByType(Text);
    const settingsText = textNodes.find(t => t.props.children === 'Settings');
    let settingsBtn = settingsText.parent;
    while (settingsBtn && settingsBtn.type !== TouchableOpacity) {
      settingsBtn = settingsBtn.parent;
    }
    act(() => {
      settingsBtn.props.onPress();
    });
    expect(mockPropNavigate).toHaveBeenCalledWith('Settings', undefined);
  });

  it('navigates to Vehicles correctly', () => {
    const mockPropNavigate = jest.fn();
    const mockPropNav = {
      navigate: mockPropNavigate,
      getParent: () => null,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          navigation={mockPropNav}
          username="Test Nav"
          email="testnav@vehicare.com"
          plan="FREE"
        />
      );
    });

    const root = tree.root;

    // Open modal
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // Test My Vehicles
    const textNodes = root.findAllByType(Text);
    const vehiclesText = textNodes.find(t => t.props.children === 'My Vehicles');
    let vehiclesBtn = vehiclesText.parent;
    while (vehiclesBtn && vehiclesBtn.type !== TouchableOpacity) {
      vehiclesBtn = vehiclesBtn.parent;
    }
    act(() => {
      vehiclesBtn.props.onPress();
    });
    expect(mockPropNavigate).toHaveBeenCalledWith('Vehicles', undefined);
  });

  it('navigates to HelpSupport correctly', () => {
    const mockPropNavigate = jest.fn();
    const mockPropNav = {
      navigate: mockPropNavigate,
      getParent: () => null,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <UserAccountCard
          navigation={mockPropNav}
          username="Test Nav"
          email="testnav@vehicare.com"
          plan="FREE"
        />
      );
    });

    const root = tree.root;

    // Open modal
    const cardTouchable = root.findAllByType(TouchableOpacity)[0];
    act(() => {
      cardTouchable.props.onPress();
    });

    // Test Help & Support
    const textNodes = root.findAllByType(Text);
    const helpText = textNodes.find(t => t.props.children === 'Help & Support');
    let helpBtn = helpText.parent;
    while (helpBtn && helpBtn.type !== TouchableOpacity) {
      helpBtn = helpBtn.parent;
    }
    act(() => {
      helpBtn.props.onPress();
    });
    expect(mockPropNavigate).toHaveBeenCalledWith('HelpSupport', undefined);
  });
});
