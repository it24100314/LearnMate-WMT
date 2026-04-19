import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Storage from '../utils/storage';

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 66, left: 16, width: 180 });
  const anchorRef = useRef<View>(null);

  const openMenuAtAnchor = () => {
    const calculatedWidth = Math.min(210, Math.max(170, screenWidth - 24));
    const anchor = anchorRef.current;

    if (!anchor || typeof anchor.measureInWindow !== 'function') {
      const fallbackLeft = Math.max(8, screenWidth - calculatedWidth - 8);
      setMenuPosition({ top: 66, left: fallbackLeft, width: calculatedWidth });
      setMenuVisible(true);
      return;
    }

    anchor.measureInWindow((x, y, w, h) => {
      const margin = 8;
      const preferredLeft = x + w - calculatedWidth;
      const clampedLeft = Math.min(
        Math.max(margin, preferredLeft),
        Math.max(margin, screenWidth - calculatedWidth - margin)
      );
      const preferredTop = y + h + 8;
      const clampedTop = Math.min(preferredTop, Math.max(8, screenHeight - 140));

      setMenuPosition({
        top: clampedTop,
        left: clampedLeft,
        width: calculatedWidth,
      });
      setMenuVisible(true);
    });
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await Storage.clearSessionAsync();
      setMenuVisible(false);
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    void performLogout();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>LearnMate</Text>
        <View ref={anchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, pressed && styles.profileBtnPressed]}
            onPress={() => (menuVisible ? setMenuVisible(false) : openMenuAtAnchor())}
          >
            <Ionicons name="person-circle-outline" size={24} color="#0f172a" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)} />
          <View style={[styles.menuCard, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <Pressable
              style={({ pressed, hovered }) => [styles.menuItem, (pressed || hovered) && styles.menuItemActive]}
            onPress={() => {
              setMenuVisible(false);
              router.push('/profile');
            }}
          >
              <Ionicons name="person-outline" size={16} color="#334155" />
              <Text style={styles.menuText}>Profile</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={({ pressed, hovered }) => [
                styles.menuItem,
                (pressed || hovered) && styles.logoutItemActive,
                loggingOut && styles.menuItemDisabled,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <Ionicons name="log-out-outline" size={16} color="#b91c1c" />
              <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  profileBtnPressed: {
    backgroundColor: '#f8fafc',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  pageSubtitle: {
    color: '#64748b',
    fontSize: 13,
  },
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  menuCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
    overflow: 'hidden',
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemActive: {
    backgroundColor: '#f8fafc',
  },
  logoutItemActive: {
    backgroundColor: '#fef2f2',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  menuText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 14,
  },
});
