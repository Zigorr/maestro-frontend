import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMoodTheme } from "../theme/ThemeContext";
import { ThemedButton } from "../components/ui/ThemedButton";

export function HomeScreen() {
  const { theme } = useMoodTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.appName, { color: theme.text }]}>
          M A E S T R O
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Real-time Affective Music Generation
        </Text>
      </View>

      {/* Center Illustration */}
      <View style={styles.imageContainer}>
        <Image
          // Adjust this path if your assets folder is located elsewhere
          source={require("../../assets/chrollo.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* Action Buttons (Docked to bottom) */}
      <View style={styles.actions}>
        <ThemedButton
          label="Stream Physiological Data"
          onPress={() => navigation.navigate("Calibrate", { mode: "csv" })}
          style={{ ...styles.actionBtn, backgroundColor: "#04999e" }}
        />
        <ThemedButton
          label="Manual Mood Selection"
          variant="secondary"
          onPress={() => navigation.navigate("Calibrate", { mode: "manual" })}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    maxHeight: 450,
  },
  actions: {
    width: "100%",
    gap: 16,
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
  },
});
