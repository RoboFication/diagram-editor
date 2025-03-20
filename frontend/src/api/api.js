import axios from "axios";

export const API_CONFIG = {
  development: {
    baseURL: "http://localhost:8000",
  },
  staging: {
    baseURL: "https://staging-api.example.com",
  },
  production: {
    baseURL: "https://api.example.com",
  },
};

export const getApiConfig = () => {
  const env = process.env.REACT_APP_ENV || "development";
  return API_CONFIG[env];
};

const { baseURL } = getApiConfig();

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const diagramService = {
  renderDiagram: async (uml) => {
    try {
      const response = await apiClient.post(
        "/render",
        { uml },
        {
          responseType: "blob",
        }
      );
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error("Render error:", error);
      throw error;
    }
  },

  saveDiagram: async (uml) => {
    if (!uml || uml.trim() === "") {
      throw new Error("Cannot save empty diagram");
    }

    try {
      const response = await apiClient.post("/save", {
        uml: uml.trim(),
      });
      return response.data;
    } catch (error) {
      console.error("Save error:", error);
      throw error;
    }
  },
};

export default diagramService;
