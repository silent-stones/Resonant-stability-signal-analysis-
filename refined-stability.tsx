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
        
        // 2. Advanced Recurrence Analysis
        const recurrenceResults = [];
        const embedding = 3;
        const delay = 5;
        
        for (let i = 0; i < signals.length - windowSize; i += windowSize/4) {
          const window = signals.slice(i, i + windowSize);
          let recurrences = 0;
          let determinism = 0;
          let diagonalLengths = [];
          
          for (let j = 0; j < windowSize - delay; j++) {
            let diagonal = 0;
            for (let k = 0; k < windowSize - delay - j; k++) {
              const dist = Math.abs(window[j+k] - window[j+k+delay]);
              if (dist < 0.1) {
                recurrences++;
                diagonal++;
              } else if (diagonal > 0) {
                diagonalLengths.push(diagonal);
                diagonal = 0;
              }
            }
            if (diagonal > 0) diagonalLengths.push(diagonal);
          }
          
          const entropy = diagonalLengths.length > 0 ?
            -diagonalLengths.reduce((sum, len) => {
              const p = len / diagonalLengths.reduce((a,b) => a+b, 0);
              return sum + p * Math.log2(p);
            }, 0) : 0;
          
          recurrenceResults.push({
            time: times[i],
            recurrenceRate: recurrences / ((windowSize - delay) * (windowSize - delay)),
            determinism: diagonalLengths.reduce((a,b) => a+b, 0) / Math.max(1, recurrences),
            entropy
          });
        }
        
        // 3. Coupling Analysis with Adaptive Strength
        const couplingResults = [];
        const maxCouplingStrength = 0.5;
        
        for (let i = 0; i < signals.length - windowSize; i += windowSize/4) {
          const couplingStrength = (maxCouplingStrength * i) / signals.length;
          const window = signals.slice(i, i + windowSize);
          
          const coupledSignal = window.map((s, j) => {
            const t = times[i + j];
            const regularCoupling = Math.sin(2 * Math.PI * t / 30);
            const chaotic = Math.sin(2 * Math.PI * t / 20) * Math.sin(2 * Math.PI * t / 15);
            return s + couplingStrength * (0.7 * regularCoupling + 0.3 * chaotic);
          });
          
          let phaseLocking = 0;
          for (let j = 1; j < windowSize; j++) {
            const origPhase = Math.atan2(window[j] - window[j-1], 1);
            const coupledPhase = Math.atan2(coupledSignal[j] - coupledSignal[j-1], 1);
            phaseLocking += Math.cos(origPhase - coupledPhase);
          }
          
          couplingResults.push({
            time: times[i],
            couplingStrength,
            phaseLockingRatio: phaseLocking / windowSize,
            energyRatio: coupledSignal.reduce((a,b) => a + b*b, 0) / 
                        window.reduce((a,b) => a + b*b, 0)
          });
        }
        
        // Calculate overall stability metrics
        setStabilityMetrics({
          breakdownThreshold,
          meanRecoveryTime: recoveryTimes.length > 0 ? 
            recoveryTimes.reduce((a,b) => a+b, 0) / recoveryTimes.length : null,
          meanPhaseLocking: couplingResults.reduce((sum, r) => sum + r.phaseLockingRatio, 0) / 
                           couplingResults.length
        });
        
        setPerturbationData(perturbResults);
        setRecurrenceData(recurrenceResults);
        setCouplingData(couplingResults);
        
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
            <div>
              <p className="font-semibold">Mean Recovery Time:</p>
              <p>{stabilityMetrics.meanRecoveryTime ? 
                  `${stabilityMetrics.meanRecoveryTime.toFixed(3)}s` : 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold">Mean Phase Locking:</p>
              <p>{stabilityMetrics.meanPhaseLocking.toFixed(3)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Phase Coherence vs. Noise Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time (seconds)', position: 'bottom' }}
                />
                <YAxis 
                  label={{ value: 'Phase Coherence', angle: -90, position: 'insideLeft' }}
                  domain={[0, 1]}
                />
                <Tooltip />
                <Legend />
                {[0.05, 0.15, 0.3, 0.5, 0.7].map((noise, idx) => (
                  <Scatter 
                    key={noise}
                    name={`Noise ${noise}`} 
                    data={perturbationData.filter(d => d.noiseLevel === noise)}
                    dataKey="phaseCoherence"
                    fill={`hsl(${idx * 60}, 70%, 50%)`}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recurrence Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recurrenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time (seconds)', position: 'bottom' }}
                />
                <YAxis 
                  label={{ value: 'Metrics', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entropy" 
                  stroke="#ff7300" 
                  name="Entropy"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="determinism" 
                  stroke="#82ca9d" 
                  name="Determinism"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Coupling Synchronization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={couplingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time (seconds)', position: 'bottom' }}
                />
                <YAxis 
                  label={{ value: 'Synchronization Metrics', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="phaseLockingRatio" 
                  stroke="#8884d8" 
                  name="Phase Locking"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="energyRatio" 
                  stroke="#82ca9d" 
                  name="Energy Ratio"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefinedStability;