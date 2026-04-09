
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { GraphData, Character, Relationship, Theme } from '../types';
import * as THREE from 'three';
import { Plus, Minus, Maximize, RotateCw, Pause, Eye, EyeOff, Layers, Filter, ChevronDown, X } from 'lucide-react';

interface GraphViewProps {
  data: GraphData;
  theme: Theme;
}

// Muted, elegant palette for groups
const CLASSIC_PALETTE = [
  '#c62828', // Crimson
  '#1565c0', // Deep Blue
  '#2e7d32', // Forest Green
  '#ef6c00', // Burnt Orange
  '#6a1b9a', // Deep Purple
  '#00838f', // Cyan Teal
  '#ad1457', // Pink
  '#f9a825', // Muted Gold
  '#455a64', // Blue Grey
  '#4e342e', // Brown
];

const GraphView: React.FC<GraphViewProps> = ({ data, theme }) => {
  const fgRef = useRef<ForceGraphMethods>(null);
  const [highlightNode, setHighlightNode] = useState<Character | null>(null); // For click (popup)
  const [hoverNode, setHoverNode] = useState<Character | null>(null); // For hover (visuals)
  const [hoverLink, setHoverLink] = useState<Relationship | null>(null); // For link hover
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  
  // Filter State
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [minInfluence, setMinInfluence] = useState(1);

  // Reset filters when data changes
  useEffect(() => {
    setHiddenGroups(new Set());
    setIsPanelExpanded(true);
    setMinInfluence(1);
  }, [data]);

  // 1. Assign colors to groups based on prevalence
  const { groupColorMap, sortedGroups } = useMemo(() => {
    const counts: Record<string, number> = {};
    data.nodes.forEach(node => {
      const g = node.group || 'Unaffiliated';
      counts[g] = (counts[g] || 0) + 1;
    });

    // Sort groups by count desc
    const groups = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    
    const map: Record<string, string> = {};
    groups.forEach((group, index) => {
      map[group] = CLASSIC_PALETTE[index % CLASSIC_PALETTE.length];
    });
    return { groupColorMap: map, sortedGroups: groups };
  }, [data]);

  // 2. Compute Filtered Data
  const filteredData = useMemo(() => {
    // Determine which nodes are visible based on group filters and influence
    const visibleNodes = data.nodes.filter(n => {
      const isGroupVisible = !hiddenGroups.has(n.group || 'Unaffiliated');
      const isInfluenceSufficient = (n.importance || 0) >= minInfluence;
      return isGroupVisible && isInfluenceSufficient;
    });
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
    // Filter and sanitize links
    const visibleLinks = data.links
      .filter(link => {
         const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
         const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
         return visibleNodeIds.has(sId) && visibleNodeIds.has(tId);
      })
      .map(link => ({
        ...link,
        source: typeof link.source === 'object' ? (link.source as any).id : link.source,
        target: typeof link.target === 'object' ? (link.target as any).id : link.target
      }));

    return { nodes: visibleNodes, links: visibleLinks };
  }, [data, hiddenGroups, minInfluence]);

  // 3. Compute Neighbors and Links for Hover Effects
  const { neighbors, nodeLinks } = useMemo(() => {
    const neighborMap = new Map<string, Set<string>>();
    const linkMap = new Map<string, Set<Relationship>>();

    filteredData.links.forEach(link => {
      const sId = typeof link.source === 'object' ? (link.source as Character).id : link.source as string;
      const tId = typeof link.target === 'object' ? (link.target as Character).id : link.target as string;

      if (!neighborMap.has(sId)) neighborMap.set(sId, new Set());
      if (!neighborMap.has(tId)) neighborMap.set(tId, new Set());
      
      neighborMap.get(sId)?.add(tId);
      neighborMap.get(tId)?.add(sId);

      if (!linkMap.has(sId)) linkMap.set(sId, new Set());
      if (!linkMap.has(tId)) linkMap.set(tId, new Set());
      
      linkMap.get(sId)?.add(link);
      linkMap.get(tId)?.add(link);
    });

    return { neighbors: neighborMap, nodeLinks: linkMap };
  }, [filteredData]);

  // Determine which nodes/links are highlighted based on hover state
  const { highlightedNodeIds, highlightedLinks } = useMemo(() => {
    const nodeIds = new Set<string>();
    const links = new Set<Relationship>();

    if (hoverNode) {
      nodeIds.add(hoverNode.id);
      const myNeighbors = neighbors.get(hoverNode.id);
      if (myNeighbors) {
        myNeighbors.forEach(nId => nodeIds.add(nId));
      }
      const myLinks = nodeLinks.get(hoverNode.id);
      if (myLinks) {
        myLinks.forEach(l => links.add(l));
      }
    }
    
    if (hoverLink) {
       links.add(hoverLink);
       const sId = typeof hoverLink.source === 'object' ? (hoverLink.source as any).id : hoverLink.source;
       const tId = typeof hoverLink.target === 'object' ? (hoverLink.target as any).id : hoverLink.target;
       nodeIds.add(sId);
       nodeIds.add(tId);
    }

    return { highlightedNodeIds: nodeIds, highlightedLinks: links };
  }, [hoverNode, hoverLink, neighbors, nodeLinks]);

  const toggleGroup = (group: string) => {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (hiddenGroups.size > 0) {
      setHiddenGroups(new Set());
    } else {
      const all = new Set(sortedGroups);
      setHiddenGroups(all);
    }
  };

  const handleNodeDragEnd = useCallback((node: any) => {
    node.fx = node.fy = node.fz = undefined;
  }, []);

  // Robust Node Rendering
  const nodeThreeObject = useCallback((node: any) => {
    const charNode = node as Character;
    const importanceVal = Number(charNode.importance);
    const importance = Number.isNaN(importanceVal) ? 1 : importanceVal;
    
    const isSelected = highlightNode?.id === charNode.id;
    const isConnected = highlightedNodeIds.has(charNode.id);
    const isDimmed = (hoverNode || hoverLink) && !isConnected && !isSelected;

    const groupName = charNode.group || 'Unaffiliated';
    const baseColor = groupColorMap[groupName] || '#888';
    
    const group = new THREE.Group();

    // 1. Sphere Body
    // Scale size based on importance
    const radius = Math.max(2, importance * 0.8) * (isSelected ? 1.2 : 1);
    const geometry = new THREE.SphereGeometry(radius, 24, 24);
    const material = new THREE.MeshLambertMaterial({ 
      color: baseColor,
      transparent: true,
      opacity: isDimmed ? 0.2 : 0.9 
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // 2. Text Label (Canvas Sprite)
    if (charNode.name) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            // High-res config for sharp text
            const fontSize = 48;
            const fontFace = '"Crimson Pro", serif';
            const text = charNode.name;
            const paddingHorizontal = 24;
            const paddingVertical = 12;

            context.font = `600 ${fontSize}px ${fontFace}`;
            const metrics = context.measureText(text);
            const textWidth = metrics.width;
            
            canvas.width = textWidth + (paddingHorizontal * 2);
            canvas.height = fontSize + (paddingVertical * 2);
            
            // Redraw after resizing
            context.font = `600 ${fontSize}px ${fontFace}`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Background Pill (Dark semi-transparent)
            // Ensures text is visible regardless of environment
            context.fillStyle = 'rgba(20, 20, 20, 0.7)';
            
            // Draw Rounded Rect manually
            const x = 0; 
            const y = 0; 
            const w = canvas.width; 
            const h = canvas.height; 
            const r = h / 2;
            
            context.beginPath();
            context.moveTo(x + r, y);
            context.lineTo(x + w - r, y);
            context.quadraticCurveTo(x + w, y, x + w, y + r);
            context.lineTo(x + w, y + h - r);
            context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            context.lineTo(x + r, y + h);
            context.quadraticCurveTo(x, y + h, x, y + h - r);
            context.lineTo(x, y + r);
            context.quadraticCurveTo(x, y, x + r, y);
            context.closePath();
            context.fill();
            
            // Text Color: Always White for contrast against dark pill
            context.fillStyle = '#ffffff';
            context.fillText(text, w / 2, h / 2 + 2); // +2 for visual centering

            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            
            const labelMaterial = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                opacity: isDimmed ? 0.3 : 1,
                depthWrite: false // Helps with transparency blending
            });
            
            const labelSprite = new THREE.Sprite(labelMaterial);
            // Scale down to world units. 
            // e.g. If height is 60px, we want it ~4-5 units high.
            const scaleFactor = 0.08; 
            labelSprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
            labelSprite.position.y = radius + 4; // Position above sphere
            
            group.add(labelSprite);
        }
    }
    
    // 3. Selection Glow (Optional ring)
    if (isSelected) {
        const ringGeo = new THREE.RingGeometry(radius * 1.4, radius * 1.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: baseColor, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.6 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.lookAt(new THREE.Vector3(0,0,1000)); // Make face camera mostly
        group.add(ring);
    }

    return group;
  }, [groupColorMap, theme, hoverNode, highlightNode, highlightedNodeIds, hoverLink]); 

  // Setup Scene Lighting & Forces
  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current as any;
      
      // Apply the requested charge force to spread nodes
      fg.d3Force('charge')?.strength(-120);

      const scene = fg.scene();
      if (scene) {
        // Clean up old lights
        const lightsToRemove: THREE.Object3D[] = [];
        scene.traverse((child: THREE.Object3D) => {
           if ((child as any).isLight && child.name !== 'custom-ambient') {
             lightsToRemove.push(child);
           }
        });
        lightsToRemove.forEach((l) => scene.remove(l));

        // Ensure ambient light
        let light = scene.getObjectByName('custom-ambient');
        if (!light) {
          light = new THREE.AmbientLight(0xffffff, 2.0);
          light.name = 'custom-ambient';
          scene.add(light);
        } else {
          (light as THREE.AmbientLight).intensity = 2.0;
        }
        
        // Add a directional light for depth on the spheres
        let dirLight = scene.getObjectByName('custom-dir');
        if (!dirLight) {
            dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
            dirLight.name = 'custom-dir';
            dirLight.position.set(100, 100, 100);
            scene.add(dirLight);
        }
      }
    }
  }, [data]);

  // Initial Camera Setup
  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current as any;
      fg.cameraPosition({ x: 1000, y: 800, z: 1000 }, { x: 0, y: 0, z: 0 }, 0);
      setTimeout(() => {
        fg.cameraPosition({ x: 200, y: 150, z: 200 }, { x: 0, y: 0, z: 0 }, 3000);
      }, 50);
    }
  }, []);

  // Controls Handlers
  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const { x, y, z } = (fgRef.current as any).cameraPosition();
    fgRef.current.cameraPosition({ x: x * 0.7, y: y * 0.7, z: z * 0.7 }, { x: 0, y: 0, z: 0 }, 1000);
  };

  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const { x, y, z } = (fgRef.current as any).cameraPosition();
    fgRef.current.cameraPosition({ x: x * 1.4, y: y * 1.4, z: z * 1.4 }, { x: 0, y: 0, z: 0 }, 1000);
  };

  const handleFit = () => {
    if (!fgRef.current) return;
    fgRef.current.zoomToFit(1000, 80);
  };

  useEffect(() => {
    let interval: any;
    if (isAutoRotating && fgRef.current) {
       interval = setInterval(() => {
         if (!fgRef.current) return;
         const { x, z } = (fgRef.current as any).cameraPosition();
         const angle = Math.atan2(z, x);
         const dist = Math.sqrt(x * x + z * z);
         const newAngle = angle + 0.003;
         fgRef.current.cameraPosition({
           x: dist * Math.cos(newAngle),
           z: dist * Math.sin(newAngle)
         });
       }, 30);
    }
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  return (
    <div 
      className="w-full h-full relative font-serif outline-none transition-colors duration-500"
      style={{
         background: theme === 'dark' 
           ? 'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #050505 100%)' 
           : 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e8e6e1 100%)'
      }}
    >
       <ForceGraph3D
          ref={fgRef}
          graphData={filteredData}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          onNodeHover={(node) => setHoverNode(node as Character || null)}
          enableNodeDrag={true}
          onNodeDragEnd={handleNodeDragEnd}
          
          // Link Rendering & Interaction
          onLinkHover={(link) => setHoverLink(link as Relationship || null)}
          linkResolution={6} // Performance optimization
          linkLabel={(link: any) => {
            const sName = link.source?.name || link.source;
            const tName = link.target?.name || link.target;
            return `
              <div style="text-align: center;">
                <div style="font-weight: 700; font-size: 1.1em; margin-bottom: 4px;">${link.relationship}</div>
                <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 6px;">
                  ${sName} 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; opacity: 0.6; margin: 0 4px;">
                    <path d="M7 16l-4-4 4-4"></path>
                    <path d="M3 12h18"></path>
                    <path d="M17 8l4 4-4 4"></path>
                  </svg>
                  ${tName}
                </div>
                ${link.details ? `<div style="font-size: 0.8em; font-style: italic; opacity: 0.7; max-width: 200px; margin: 0 auto; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">${link.details}</div>` : ''}
              </div>
            `;
          }}
          
          // Width: Thicker when highlighted
          linkWidth={link => highlightedLinks.has(link as Relationship) ? 1.2 : 0.5}

          // Color: Source node color when highlighted, otherwise gray
          linkColor={link => {
            const rel = link as Relationship;
            const isHighlighted = highlightedLinks.has(rel);
            
            if (isHighlighted) {
               const sGroup = (typeof rel.source === 'object' ? (rel.source as any).group : null) || 'Unaffiliated';
               return groupColorMap[sGroup] || (theme === 'dark' ? '#ffffff' : '#000000');
            }
            
            // Fade out background links heavily when something is focused
            if (highlightedNodeIds.size > 0) {
               return theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
            }
            // Default subtle state
            return theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
          }}
          linkOpacity={1} 
          
          // Remove all extra decorations (arrows/particles)
          linkDirectionalArrowLength={0}
          linkDirectionalParticles={0}
          
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          warmupTicks={50}
          d3AlphaDecay={0.01}
          onNodeClick={(node) => {
             const distRatio = 1 + 200 / Math.hypot(node.x, node.y, node.z);
             fgRef.current?.cameraPosition(
               { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
               node as any,
               2000
             );
             setHighlightNode(node as Character);
          }}
        />
        
        {/* Spline-Style Navigation Controls (Bottom Left) */}
        <div className="absolute bottom-8 left-8 flex items-center gap-2 z-40">
           <div className="glass-panel rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
              <button onClick={handleZoomIn} className="p-2 dark:hover:bg-white/10 hover:bg-black/5 rounded-full dark:text-[#ccc] text-gray-500 dark:hover:text-white hover:text-black transition-colors" title="Zoom In">
                <Plus size={18} />
              </button>
              <div className="w-px h-4 dark:bg-white/10 bg-black/10"></div>
              <button onClick={handleZoomOut} className="p-2 dark:hover:bg-white/10 hover:bg-black/5 rounded-full dark:text-[#ccc] text-gray-500 dark:hover:text-white hover:text-black transition-colors" title="Zoom Out">
                <Minus size={18} />
              </button>
              <div className="w-px h-4 dark:bg-white/10 bg-black/10"></div>
              <button onClick={handleFit} className="p-2 dark:hover:bg-white/10 hover:bg-black/5 rounded-full dark:text-[#ccc] text-gray-500 dark:hover:text-white hover:text-black transition-colors" title="Fit to Screen">
                <Maximize size={16} />
              </button>
              <div className="w-px h-4 dark:bg-white/10 bg-black/10"></div>
              <button 
                onClick={() => setIsAutoRotating(!isAutoRotating)} 
                className={`p-2 rounded-full transition-colors ${isAutoRotating ? 'dark:text-white text-black dark:bg-white/20 bg-black/10' : 'dark:text-[#ccc] text-gray-500 dark:hover:bg-white/10 hover:bg-black/5'}`} 
                title="Auto Rotate"
              >
                {isAutoRotating ? <Pause size={16} /> : <RotateCw size={16} />}
              </button>
           </div>
        </div>

        {/* Legend / Filter Panel - Top Right */}
        <div className={`absolute top-24 right-6 glass-panel border dark:border-[#333] border-gray-200 z-40 w-[260px] shadow-xl rounded-sm flex flex-col transition-all duration-300 ease-in-out ${isPanelExpanded ? 'max-h-[70vh]' : 'max-h-[50px] overflow-hidden'}`}>
           <div 
             className={`p-3 flex justify-between items-center bg-opacity-50 dark:bg-black/20 bg-white/20 ${isPanelExpanded ? 'border-b dark:border-[#333] border-gray-200' : ''}`}
           >
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              >
                <Filter size={14} className="dark:text-[#888] text-gray-500" />
                <h4 className="text-xs font-semibold uppercase tracking-widest dark:text-[#888] text-gray-500">FILTERS</h4>
                <ChevronDown size={14} className={`dark:text-[#888] text-gray-500 transition-transform duration-300 ${isPanelExpanded ? 'rotate-180' : ''}`} />
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); toggleAllGroups(); }}
                className="text-[10px] font-sans font-medium uppercase tracking-wider dark:text-[#666] text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                {hiddenGroups.size > 0 ? 'SHOW ALL' : 'HIDE ALL'}
              </button>
           </div>
           
           <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${isPanelExpanded ? 'opacity-100' : 'opacity-0'}`}>
             
             {/* Influence Filter */}
             <div className="px-4 py-4 border-b dark:border-[#333] border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-end mb-3">
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider dark:text-[#888] text-gray-500 flex items-center gap-1">
                       Min Importance
                    </label>
                    <span className="text-xs font-mono dark:text-[#e5e5e5] text-black">
                      {minInfluence} <span className="dark:text-[#555] text-gray-400">/ 10</span>
                    </span>
                </div>
                <div className="relative w-full h-4 flex items-center">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={minInfluence}
                      onChange={(e) => setMinInfluence(Number(e.target.value))}
                      className="w-full h-1 bg-gray-300 dark:bg-[#333] rounded-full appearance-none cursor-pointer accent-black dark:accent-[#e5e5e5] hover:accent-gray-700 dark:hover:accent-white transition-all z-10"
                    />
                </div>
                <div className="flex justify-between mt-1 px-0.5">
                   <span className="text-[9px] dark:text-[#555] text-gray-400 uppercase tracking-wide">All Characters</span>
                   <span className="text-[9px] dark:text-[#555] text-gray-400 uppercase tracking-wide">Main Only</span>
                </div>
             </div>

             {/* Groups List */}
             <div className="overflow-y-auto custom-scrollbar p-2 space-y-1 flex-1 min-h-0">
               {sortedGroups.map((group) => {
                 const color = groupColorMap[group];
                 const isHidden = hiddenGroups.has(group);
                 
                 return (
                   <button 
                     key={group} 
                     onClick={() => toggleGroup(group)}
                     className={`
                       w-full flex items-center justify-between p-2 rounded-sm transition-all duration-200
                       ${isHidden 
                          ? 'opacity-50 hover:opacity-80 dark:hover:bg-white/5 hover:bg-black/5' 
                          : 'dark:hover:bg-white/10 hover:bg-black/5'
                       }
                     `}
                   >
                     <div className="flex items-center gap-3 overflow-hidden">
                       <div 
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border ${isHidden ? 'bg-transparent' : ''}`} 
                          style={{ 
                            backgroundColor: isHidden ? 'transparent' : color,
                            borderColor: color 
                          }}
                       ></div>
                       <span className={`text-sm font-serif truncate ${isHidden ? 'dark:text-[#666] text-gray-400 line-through' : 'dark:text-[#ccc] text-gray-700'}`}>
                         {group}
                       </span>
                     </div>
                     
                     <div className="dark:text-[#555] text-gray-300">
                       {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                     </div>
                   </button>
                 );
               })}
               
               {sortedGroups.length === 0 && (
                  <div className="p-4 text-center text-xs dark:text-[#555] text-gray-400 italic">No groups found</div>
               )}
             </div>
           </div>
        </div>
        
        {/* Detail Panel - Top Left */}
        {highlightNode && (
          <div className="absolute top-24 left-6 p-8 glass-panel border dark:border-[#333] border-gray-200 max-w-md shadow-2xl animate-scale-in z-50 rounded-sm transition-colors">
             <div className="flex justify-between items-start mb-4 border-b dark:border-[#333] border-gray-200 pb-4">
               <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a]">{highlightNode.name}</h2>
                    <span 
                        className="inline-block mt-1 px-2 py-0.5 text-xs font-sans font-semibold uppercase tracking-wider dark:text-black text-white rounded-sm"
                        style={{ backgroundColor: groupColorMap[highlightNode.group || 'Unaffiliated'] || '#ccc' }}
                    >
                        {highlightNode.group}
                    </span>
                  </div>
               </div>
               <button 
                 onClick={() => setHighlightNode(null)}
                 className="dark:text-[#666] text-gray-400 dark:hover:text-[#e5e5e5] hover:text-black transition-colors"
               >
                 <X size={20} />
               </button>
             </div>
             <p className="dark:text-[#bbb] text-gray-600 text-lg mb-6 leading-relaxed font-serif">
               {highlightNode.description}
             </p>
             <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-widest dark:text-[#666] text-gray-500 font-sans">INFLUENCE</span>
                <div className="h-1 flex-1 dark:bg-[#333] bg-gray-200 overflow-hidden">
                   <div 
                     className="h-full dark:bg-[#e5e5e5] bg-gray-800" 
                     style={{ width: `${(Number(highlightNode.importance) || 1) * 10}%`}}
                   />
                </div>
                <span className="text-sm dark:text-[#888] text-gray-500 font-serif italic">{highlightNode.importance}/10</span>
             </div>
          </div>
        )}
    </div>
  );
};

export default GraphView;
