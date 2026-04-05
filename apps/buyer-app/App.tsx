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
        <Tab.Screen name="Search" children={() => <PlaceholderScreen name="Search" />} />
        <Tab.Screen name="My Garage" children={() => <PlaceholderScreen name="My Garage" />} />
        <Tab.Screen name="Orders" children={() => <PlaceholderScreen name="Orders" />} />
        <Tab.Screen name="Account" children={() => <PlaceholderScreen name="Account" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
