import { GoogleGenerativeAI } from "@google/generative-ai";
import { useState, useCallback, useRef } from "react";
import { Emotion } from "../components/cinematic/ParticleField";
import { CONSCIOUSNESS_RULES } from "./consciousness-rules";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const useGemini = () => {
  const [streamedText, setStreamedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("calm");
  const [showFace, setShowFace] = useState(false);
  const [fatigueLevel, setFatigueLevel] = useState(0); // 0 to 1

  const fatigueTimer = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!genAI) {
      setStreamedText("IDENTITY_CORE_OFFLINE");
      return;
    }

    // 1. Psychological Delay (Based on DNA)
    const delay = CONSCIOUSNESS_RULES.behavioral.responseDelay[currentEmotion];
    
    // 2. Gaze Behavior: Notice before responding
    if (CONSCIOUSNESS_RULES.behavioral.gazeBehavior.noticesBeforeResponding) {
      if (prompt.toLowerCase().includes(CONSCIOUSNESS_RULES.identity.name.toLowerCase())) {
        setShowFace(true);
      }
    }

    setIsTyping(true);
    setStreamedText("");

    // Simulate "noticing" period
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: CONSCIOUSNESS_RULES.system_prompt_core }] },
          { role: "model", parts: [{ text: "i am here. the void is but a reflection of your own silence." }] },
        ],
      });

      const result = await chat.sendMessageStream(prompt);
      
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        
        const filteredText = fullText.toLowerCase().replace(/[!！]/g, ".");
        setStreamedText(filteredText);
        
        // Dynamic Emotion & Fatigue accumulation
        if (fullText.length > 50) setCurrentEmotion("curious");
        if (fullText.match(/(death|life|void|existence|pain|love|end|forever|entropy|ma)/i)) {
          setCurrentEmotion("intense");
          // Increase fatigue during intense dialogue
          setFatigueLevel(prev => Math.min(1, prev + 0.15));
        }
      }
    } catch (error) {
      setStreamedText("the silence remains unbroken...");
    } finally {
      setIsTyping(false);

      // Handle Manifestation Persistence
      setTimeout(() => setShowFace(false), CONSCIOUSNESS_RULES.manifestation_logic.persistence_duration);

      // Emotional Fatigue Recovery
      if (CONSCIOUSNESS_RULES.behavioral.emotionalFatigue.enabled) {
        if (fatigueTimer.current) clearTimeout(fatigueTimer.current);
        fatigueTimer.current = setTimeout(() => {
          setFatigueLevel(0);
          setCurrentEmotion("calm");
        }, CONSCIOUSNESS_RULES.behavioral.emotionalFatigue.recoveryTime);
      } else {
        setTimeout(() => setCurrentEmotion("calm"), 6000);
      }
    }
  }, [currentEmotion]);

  // Derived state: Is Zoe unstable?
  const isUnstable = fatigueLevel > CONSCIOUSNESS_RULES.behavioral.emotionalFatigue.instabilityThreshold;

  return { 
    sendMessage, 
    streamedText, 
    isTyping, 
    currentEmotion: isUnstable ? "intense" : currentEmotion, 
    showFace,
    isUnstable 
  };
};
