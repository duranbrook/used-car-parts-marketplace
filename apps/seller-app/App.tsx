import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";

const Tab = createBottomTabNavigator();

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>{name}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Inventory" children={() => <PlaceholderScreen name="Inventory" />} />
        <Tab.Screen name="List Part" children={() => <PlaceholderScreen name="List Part" />} />
        <Tab.Screen name="Orders" children={() => <PlaceholderScreen name="Orders" />} />
        <Tab.Screen name="Analytics" children={() => <PlaceholderScreen name="Analytics" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
