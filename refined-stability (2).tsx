import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Papa from 'papaparse';

const RefinedStability = () => {
  const [perturbationData, setPerturbationData] = useState([]);
  const [recurrenceData, setRecurrenceData] = useState([]);
  const [couplingData, setCouplingData] = useState([]);
  const [stabilityMetrics, setStabilityMetrics] = useState(null);
  
  useEffect(() => {
    const analyzeData = async () => {
      try {
        const response = await window.fs.readFile('Synthetic_Resonant_Dataset.csv', { encoding: 'utf8' });
        const result = Papa.parse(response, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        const signals = result.data.map(row => row.Resonant_Signal);
        const times = result.data.map(row => row.Time);
        
        // 1. Enhanced Perturbation Analysis
        const noiseLevels = [0.05, 0.15, 0.3, 0.5, 0.7];
        const windowSize = 50;
        const perturbResults = [];
        let breakdownThreshold = Infinity;
        let recoveryTimes = [];
        
        noiseLevels.forEach(noise => {
          const perturbedSignal = signals.map(s => s + (Math.random() - 0.5) * 2 * noise);
          let lastStableTime = 0;
          let isStable = true;
          
          for (let i = 0; i < signals.length - windowSize; i += windowSize/4) {
            const window = signals.slice(i, i + windowSize);
            const pertWindow = perturbedSignal.slice(i, i + windowSize);
            
            let phaseDiff = 0;
            let amplitudeDeviation = 0;
            
            for (let j = 1; j < windowSize; j++) {
              const origPhase = Math.atan2(window[j] - window[j-1], 1);
              const pertPhase = Math.atan2(pertWindow[j] - pertWindow[j-1], 1);
              phaseDiff += Math.abs(origPhase - pertPhase);
              amplitudeDeviation += Math.abs(Math.abs(pertWindow[j]) - Math.abs(window[j]));
            }
            
            const coherence = Math.exp(-phaseDiff/windowSize);
            
            // Track stability transitions
            if (coherence < 0.7 && isStable) {
              isStable = false;
              lastStableTime = times[i];
              if (noise < breakdownThreshold) breakdownThreshold = noise;
            } else if (coherence >= 0.7 && !isStable) {
              isStable = true;
              recoveryTimes.push(times[i] - lastStableTime);
            }
            
            perturbResults.push({
              time: times[i],
              noiseLevel: noise,
              phaseCoherence: coherence,
              amplitudeStability: 1 - (amplitudeDeviation/windowSize),
              isStable
            });
          }
        });

        setPerturbationData(perturbResults);
        
      } catch (error) {
        console.error('Error analyzing data:', error);
      }
    };
    
    analyzeData();
  }, []);
  
  if (!stabilityMetrics) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stability Metrics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold">Breakdown Threshold:</p>
              <p>{stabilityMetrics.breakdownThreshold.toFixed(3)} (noise level)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefinedStability;
