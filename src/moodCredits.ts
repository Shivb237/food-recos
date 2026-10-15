/** Photographers behind the mood tile photos in public/moods (Pexels licence: free to use). */
export const MOOD_CREDITS: { mood: string; id: number; by: string }[] = [
  { mood: "cheap", id: 5410400, by: "Saveurs Secretes" },
  { mood: "treat", id: 33430556, by: "Anil Sharma" },
  { mood: "punjabi", id: 12737918, by: "dhiraj jain" },
  { mood: "biryani", id: 5410401, by: "Saveurs Secretes" },
  { mood: "south", id: 28107046, by: "Kavya Pothabattula" },
  { mood: "thali", id: 25440306, by: "Shubham Singh" },
  { mood: "homestyle", id: 8996219, by: "I Own My Food Art" },
  { mood: "clean", id: 6065181, by: "Alesia Kozik" },
  { mood: "snack", id: 4449068, by: "Satyam Verma" },
  { mood: "sweets", id: 8887059, by: "Lara Jameson" },
  { mood: "pizza", id: 5640020, by: "Shameel mukkath" },
];

export const pexelsPage = (id: number) => `https://www.pexels.com/photo/${id}/`;
