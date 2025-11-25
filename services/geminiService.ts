import { GoogleGenAI, Type } from "@google/genai";
import { Student } from '../types';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStudentsAI = async (
  count: number,
  degree: string,
  department: string,
  year: number,
  semester: number,
  startRollNo: number
): Promise<Student[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Generate ${count} realistic college student profiles for Degree: ${degree}, Department: ${department}, Year: ${year}, Semester: ${semester}. 
    Start roll numbers from ${startRollNo}. One of them should be a Class Representative (isCR).`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              rollNo: { type: Type.STRING },
              email: { type: Type.STRING },
              isCR: { type: Type.BOOLEAN },
            },
            required: ["name", "rollNo", "email", "isCR"],
          },
        },
      },
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Post-process to match our internal Student interface
    return rawData.map((s: any, index: number) => ({
      id: `gen_${Date.now()}_${index}`,
      name: s.name,
      rollNo: s.rollNo,
      degree: degree,
      department: department,
      year: year,
      semester: semester,
      isCR: s.isCR,
      email: s.email,
      password: '12345' // Default password for AI generated students
    }));

  } catch (error) {
    console.error("Error generating students:", error);
    return [];
  }
};

export const generateAttendanceInsight = async (
  courseName: string,
  totalStudents: number,
  presentCount: number,
  date: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze this attendance data: Course: ${courseName}, Date: ${date}, Present: ${presentCount}/${totalStudents}. 
    Give a 1-sentence professional summary or observation suitable for a dashboard notification.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Attendance data processed.";
  } catch (error) {
    return "Unable to generate insight at this time.";
  }
};