import { User } from "@/types";

export const mockUser: User = {
  id: "user_001",
  name: "Kaushik Kaja",
  email: "kaushikskaja@gmail.com",
  oldAddress: {
    street: "1234 Oak Valley Dr",
    city: "El Dorado Hills",
    state: "CA",
    zip: "95762",
  },
  newAddress: {
    street: "456 Capitol Mall",
    city: "Sacramento",
    state: "CA",
    zip: "95814",
  },
  preferences: {
    budget: { min: 1400, max: 2000 },
    bedrooms: 2,
    petFriendly: false,
    moveDate: "2026-04-01",
  },
};
