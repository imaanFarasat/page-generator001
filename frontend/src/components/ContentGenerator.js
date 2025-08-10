import React, { useState } from 'react';
import { Sparkles, Loader2, FileText, Plus, GripVertical } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ContentGenerator = () => {
  const [formData, setFormData] = useState({
    h1: '',
    h2s: '',
    category: 'Nail',
    tags: ''
  });
  const [h2sArray, setH2sArray] = useState([]); // ← New state for H2s array
  const [processedH2s, setProcessedH2s] = useState([]); // ← New state for processed H2s
  const [showProcessedH2s, setShowProcessedH2s] = useState(false); // ← Control processed H2s display
  const [faqCount, setFaqCount] = useState(20); // ← New state for FAQ count
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null); // ← For drag and drop
  const [plainContent, setPlainContent] = useState(null); // ← New state for plain AI content
  const [showPlainContent, setShowPlainContent] = useState(false); // ← Control plain content display
  const [savingToDatabase, setSavingToDatabase] = useState(false); // ← Control save to database state
  const [editableMetaTitle, setEditableMetaTitle] = useState(''); // ← New state for editable meta title
  const [editableMetaDescription, setEditableMetaDescription] = useState(''); // ← New state for editable meta description
  const [selectedLocation, setSelectedLocation] = useState(''); // ← New state for location selection

  // Predefined Canadian cities for location selection
  const availableLocations = [
    {
      region: "CA-ON",
      placename: "Toronto",
      position: "43.6532;-79.3832"
    },
    {
      region: "CA-ON",
      placename: "Brampton",
      position: "43.7315;-79.7624"
    },
    {
      region: "CA-ON",
      placename: "Scarborough",
      position: "43.7764;-79.2318"
    },
    {
      region: "CA-ON",
      placename: "Mississauga",
      position: "43.5890;-79.6441"
    },
    {
      region: "CA-ON",
      placename: "Ottawa",
      position: "45.4215;-75.6972"
    },
    {
      region: "CA-ON",
      placename: "Hamilton",
      position: "43.2557;-79.8711"
    },
    {
      region: "CA-ON",
      placename: "London",
      position: "42.9849;-81.2453"
    }
  ];

  // Helper function to safely render content (prevents object rendering errors)
  const safeRender = (content) => {
    if (content === null || content === undefined) return 'N/A';
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return content.toString();
    if (typeof content === 'boolean') return content.toString();
    if (Array.isArray(content)) return content.length.toString();
    if (typeof content === 'object') return '[Object]';
    return 'Unknown type';
  };

  // Function to parse marked content with the new structure
  const parseMarkedContent = (text) => {
    console.log('parseMarkedContent called with text:', text);
    
    const parsed = {
      head: {
        title: '',
        meta: {
          description: ''
        }
      },
      body: {
        h1: '',
        intro: '',
        sections: [],
        faqs: []
      },
      identifier: {
        id: '',
        handle: formData.handle || generateHandle(formData.h1)
      },
      classification: {
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      }
    };

    // Add location to meta if selected
    if (selectedLocation) {
      const locationData = availableLocations.find(loc => loc.placename === selectedLocation);
      if (locationData) {
        parsed.head.meta.geo = {
          region: locationData.region,
          placename: locationData.placename,
          position: locationData.position
        };
      }
    }
    
    // Extract H1 (multiple formats: "H1 Title: X" or "# X" or "Title: X")
    let h1Match = text.match(/H1\s+Title:\s*([^\n]+)/i);
    if (!h1Match) {
      h1Match = text.match(/^#\s+(.+)$/m);
    }
    if (!h1Match) {
      h1Match = text.match(/Title:\s*([^\n]+)/i);
    }
    parsed.body.h1 = h1Match ? h1Match[1].trim() : '';
    
    // Extract title (after META TITLE:)
    const metaTitleMatch = text.match(/META TITLE:\s*([^\n]+)/i);
    parsed.head.title = metaTitleMatch ? metaTitleMatch[1].trim() : `Best ${parsed.h1} Guide - Complete Information & Tips`;
    
    // Extract meta description (after META DESCRIPTION:)
    const metaDescriptionMatch = text.match(/META DESCRIPTION:\s*([\s\S]*?)(?=\n\nINTRODUCTION|SECTION|BULLET POINTS|FAQS|$)/i);
    parsed.head.meta.description = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : `Discover everything about ${parsed.h1}. Get expert insights, tips, and comprehensive information. Learn the best practices and latest trends.`;
    
    // Ensure meta description is complete (sometimes it gets cut off)
    if (parsed.head.meta.description && !parsed.head.meta.description.endsWith('!') && !parsed.head.meta.description.endsWith('.') && !parsed.head.meta.description.endsWith('"')) {
      // Look for the complete description in rawContent
      const completeDescMatch = text.match(/META DESCRIPTION:\s*([\s\S]*?)(?=\n\nINTRODUCTION|$)/i);
      if (completeDescMatch) {
        parsed.head.meta.description = completeDescMatch[1].trim();
      }
    }
    
    // Extract intro (after INTRODUCTION:)
    const introMatch = text.match(/INTRODUCTION:\s*([\s\S]*?)(?=\n\nSECTION|BULLET POINTS|FAQS|$)/i);
    parsed.body.intro = introMatch ? introMatch[1].trim() : '';
    
    // Extract global bullet points (after BULLET POINTS:)
    const globalBulletMatch = text.match(/BULLET POINTS:\s*\n([\s\S]*?)(?=\n\nFAQS|$)/i);
    let globalBullets = [];
    if (globalBulletMatch) {
      const bulletText = globalBulletMatch[1];
      const bulletLines = bulletText.split('\n').filter(line => line.trim().startsWith('•'));
      globalBullets = bulletLines.map(line => line.replace(/^•\s*/, '').trim());
      console.log('Global bullets found:', globalBullets);
    }
    
    // Extract sections (after SECTION X:)
    const sectionRegex = /SECTION\s+\d+:\s*([^\n]+)\n([\s\S]*?)(?=\n\nSECTION|BULLET POINTS|FAQS|$)/gi;
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(text)) !== null) {
      const sectionTitle = sectionMatch[1].trim();
      const sectionText = sectionMatch[2].trim();
      
      // Split section text into paragraphs (split by double newlines)
      const paragraphs = sectionText.split(/\n\n+/).filter(p => p.trim().length > 0);
      
      // Extract bullets if they exist in this section
      let bullets = [];
      
      // First try to find BULLET POINTS section within this section
      const bulletMatch = sectionText.match(/BULLET POINTS:\s*\n([\s\S]*?)(?=\n\n|$)/i);
      if (bulletMatch) {
        const bulletText = bulletMatch[1];
        const bulletLines = bulletText.split('\n').filter(line => line.trim().startsWith('•'));
        bullets.push(...bulletLines.map(line => line.replace(/^•\s*/, '').trim()));
      }
      
      // If no bullets found in section, look for any lines starting with • anywhere in the section
      if (bullets.length === 0) {
        const allBulletLines = sectionText.split('\n').filter(line => line.trim().startsWith('•'));
        if (allBulletLines.length > 0) {
          bullets.push(...allBulletLines.map(line => line.replace(/^•\s*/, '').trim()));
        }
      }
      
      // If still no bullets found and we have global bullets, assign them to this section
      // (assuming the first section should get the global bullets)
      if (bullets.length === 0 && globalBullets.length > 0 && parsed.body.sections.length === 0) {
        bullets = [...globalBullets];
      }
      
      parsed.body.sections.push({
        h2: sectionTitle,
        paragraphs: paragraphs,
        bullets: bullets
      });
    }
    
    // Extract FAQs (after FAQS:)
    const faqMatch = text.match(/FAQS:\s*\n([\s\S]*?)(?=\n\n|$)/i);
    if (faqMatch) {
      const faqText = faqMatch[1];
      console.log('FAQ text found:', faqText);
      
      // Split by lines and find Q&A pairs
      const lines = faqText.split('\n').filter(line => line.trim().length > 0);
      let currentQuestion = '';
      let currentAnswer = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if line starts with Q (question)
        if (line.match(/^Q\d*:/i)) {
                  // If we have a previous Q&A pair, save it
        if (currentQuestion && currentAnswer) {
          parsed.body.faqs.push({ 
            question: currentQuestion.replace(/^Q\d*:\s*/i, '').trim(), 
            answer: currentAnswer.trim() 
          });
        }
          
          // Start new question
          currentQuestion = line;
          currentAnswer = '';
        } else if (line.length > 0 && currentQuestion) {
          // This is part of the answer
          if (currentAnswer) {
            currentAnswer += ' ' + line;
          } else {
            currentAnswer = line;
          }
        }
      }
      
      // Don't forget the last Q&A pair
      if (currentQuestion && currentAnswer) {
        parsed.body.faqs.push({ 
          question: currentQuestion.replace(/^Q\d*:\s*/i, '').trim(), 
          answer: currentAnswer.trim() 
        });
      }
      
      console.log('Parsed FAQs:', parsed.body.faqs);
    }
    
    console.log('Parsed content:', parsed);
    console.log('FAQ count:', parsed.body.faqs.length);
    console.log('Meta description length:', parsed.head.meta.description ? parsed.head.meta.description.length : 0);
    return parsed;
  };

  // Function to initialize editable meta fields when content is generated
  const initializeEditableMetaFields = (content) => {
    if (content && content.head && content.head.title) {
      setEditableMetaTitle(content.head.title);
    }
    if (content && content.head && content.head.meta && content.head.meta.description) {
      setEditableMetaDescription(content.head.meta.description);
    }
  };

  // Function to reset meta fields to original AI-generated values
  const resetMetaFields = () => {
    if (generatedContent && generatedContent.content) {
      setEditableMetaTitle(generatedContent.content.head?.title || '');
      setEditableMetaDescription(generatedContent.content.head?.meta?.description || '');
      // Sync with structured content after reset
      setTimeout(() => syncMetaFieldsWithContent(), 100);
    }
  };

  // Function to sync editable meta fields with structured content data
  const syncMetaFieldsWithContent = () => {
    if (generatedContent && generatedContent.content) {
      const updatedContent = {
        ...generatedContent.content,
        head: {
          ...generatedContent.content.head,
          title: editableMetaTitle,
          meta: {
            ...generatedContent.content.head?.meta,
            description: editableMetaDescription
          }
        }
      };
      
      setGeneratedContent({
        ...generatedContent,
        content: updatedContent
      });
    }
  };

  // Function to check if meta fields have been modified from original values
  const areMetaFieldsModified = () => {
    if (!generatedContent || !generatedContent.content) return false;
    
    const originalTitle = generatedContent.content.head?.title || '';
    const originalDescription = generatedContent.content.head?.meta?.description || '';
    
    return editableMetaTitle !== originalTitle || editableMetaDescription !== originalDescription;
  };

  // Function to capitalize first letter of each word
  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'h1') {
      // Auto-capitalize first letter of each word for H1
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: capitalizeWords(value)
        };
        
        // Auto-update handle if user hasn't manually edited it
        if (!prev.handle || prev.handle === generateHandle(prev.h1)) {
          newData.handle = generateHandle(capitalizeWords(value));
        }
        
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Update h2sArray when h2s textarea changes
    if (name === 'h2s') {
      const h2List = value
        .split('\n')
        .map(h2 => h2.trim())
        .filter(h2 => h2.length > 0);
      setH2sArray(h2List);
    }
  };

  // Function to clean H2 input (remove numbers, single letters, time periods)
  const cleanH2Input = (h2s) => {
    return h2s.map(h2 => {
      if (!h2 || typeof h2 !== 'string') return '';
      
      // Split by newlines and take only the first line (the keyword)
      const lines = h2.split('\n');
      const firstLine = lines[0]?.trim();
      
      if (!firstLine) return '';
      
      // Debug: Show what we're cleaning
      console.log('Cleaning:', firstLine);
      
      // Clean the first line to remove any remaining unwanted characters
      let cleaned = firstLine
        // Remove time periods with numbers first
        .replace(/\b\d+\s*weeks?\b/gi, '')
        .replace(/\b\d+\s*days?\b/gi, '')
        .replace(/\b\d+\s*months?\b/gi, '')
        // Remove all numbers (including decimals, commas, etc.)
        .replace(/\b\d+(?:,\d{3})*(?:\.\d+)?\b/g, '')
        // Remove single letters (standalone A-Z, a-z)
        .replace(/\b[a-zA-Z]\b/g, '')
        // Remove any remaining standalone numbers or decimals
        .replace(/\b\d+\.\d+\b/g, '')
        .replace(/\b\d+\b/g, '')
        // Remove any remaining single characters that might be left
        .replace(/\b[a-zA-Z]\b/g, '')
        // Add more aggressive cleaning for remaining patterns
        .replace(/\bweeks?\b/gi, '')
        .replace(/\bdays?\b/gi, '')
        .replace(/\bmonths?\b/gi, '')
        .replace(/\b\d+\b/g, '')
        .replace(/\b[a-zA-Z]\b/g, '')
        // Remove any remaining decimal numbers
        .replace(/\b\d+\.\d+\b/g, '')
        // Remove any remaining commas and numbers
        .replace(/,\d+/g, '')
        // Remove any remaining single characters
        .replace(/\b[a-zA-Z]\b/g, '')
        // Clean up multiple spaces and trim
        .replace(/\s+/g, ' ')
        .trim();
      
      // Debug: Show cleaning result
      console.log('Cleaned to:', cleaned);
      
      // Additional debug: Show what was removed
      const removed = firstLine.replace(cleaned, '').trim();
      if (removed) {
        console.log('Removed:', removed);
      }
      
      return cleaned;
    }).filter(h2 => h2.length > 0); // Remove empty strings
  };

  // Function to handle proceed button click
  const handleProceed = () => {
    if (!formData.h2s.trim()) {
      toast.error('Please enter H2 sections first');
      return;
    }

    // Debug: Show what we're cleaning
    console.log('Original H2s:', h2sArray);
    
    const cleanedH2s = cleanH2Input(h2sArray);
    
    // Debug: Show cleaning results
    console.log('Cleaned H2s:', cleanedH2s);
    
    if (cleanedH2s.length === 0) {
      toast.error('After cleaning, no valid H2 sections remain. Please provide meaningful section titles.');
      return;
    }

    // Convert to processed format with h2/h3 toggle
    const processed = cleanedH2s.map((h2, index) => ({
      id: `h2-${index}`,
      text: h2,
      type: 'h2', // Default to h2
      order: index
    }));

    setProcessedH2s(processed);
    setShowProcessedH2s(true);
    toast.success(`Processed ${processed.length} H2 sections successfully!`);
  };

  // Function to add manual H2
  const addManualH2 = () => {
    const newH2 = {
      id: `manual-${Date.now()}`,
      text: '',
      type: 'h2',
      order: processedH2s.length
    };
    setProcessedH2s([...processedH2s, newH2]);
  };

  // Function to update H2 text
  const updateH2Text = (id, newText) => {
    setProcessedH2s(prev => prev.map(h2 => 
      h2.id === id ? { ...h2, text: newText } : h2
    ));
  };

  // Function to toggle H2/H3
  const toggleH2Type = (id) => {
    setProcessedH2s(prev => prev.map(h2 => 
      h2.id === id ? { ...h2, type: h2.type === 'h2' ? 'h3' : 'h2' } : h2
    ));
  };

  // Function to remove H2
  const removeH2 = (id) => {
    setProcessedH2s(prev => {
      const filtered = prev.filter(h2 => h2.id !== id);
      // Reorder remaining items
      return filtered.map((h2, index) => ({ ...h2, order: index }));
    });
  };

  // Drag and Drop functions for processed H2s
  const handleProcessedDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProcessedDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleProcessedDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newProcessedH2s = [...processedH2s];
    const draggedItem = newProcessedH2s[draggedIndex];
    
    // Remove dragged item
    newProcessedH2s.splice(draggedIndex, 1);
    // Insert at new position
    newProcessedH2s.splice(dropIndex, 0, draggedItem);
    
    // Update order for all items
    const reordered = newProcessedH2s.map((h2, index) => ({ ...h2, order: index }));
    
    setProcessedH2s(reordered);
    setDraggedIndex(null);
  };

  const handleProcessedDragEnd = () => {
    setDraggedIndex(null);
  };

  const generateHandle = (h1) => {
    return h1.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  // Drag and Drop functions for original H2s
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newH2sArray = [...h2sArray];
    const draggedItem = newH2sArray[draggedIndex];
    
    // Remove dragged item
    newH2sArray.splice(draggedIndex, 1);
    // Insert at new position
    newH2sArray.splice(dropIndex, 0, draggedItem);
    
    setH2sArray(newH2sArray);
    
    // Update formData.h2s with new order
    setFormData(prev => ({
      ...prev,
      h2s: newH2sArray.join('\n')
    }));
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.h1.trim()) {
      toast.error('Please enter an H1 title');
      return;
    }

    // Use processed H2s if available, otherwise fall back to original logic
    let finalH2s = [];
    if (showProcessedH2s && processedH2s.length > 0) {
      finalH2s = processedH2s
        .filter(h2 => h2.text.trim().length > 0)
        .sort((a, b) => a.order - b.order)
        .map(h2 => h2.text.trim());
    } else {
      finalH2s = h2sArray.length > 0 ? h2sArray : formData.h2s
        .split('\n')
        .map(h2 => h2.trim())
        .filter(h2 => h2.length > 0);
    }

    if (finalH2s.length === 0) {
      toast.error('Please enter at least one H2 section');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare location data if selected
      let locationData = null;
      if (selectedLocation) {
        const locationObj = availableLocations.find(loc => loc.placename === selectedLocation);
        if (locationObj) {
          locationData = locationObj;
        }
      }

      const response = await axios.post('/api/generate/content', {
        h1: formData.h1,
        h2s: finalH2s,
        handle: formData.handle || generateHandle(formData.h1),
        faqCount: faqCount,
        location: locationData,
        category: formData.category,
        tags: formData.tags
      });

      // Store the plain content first
      setPlainContent(response.data);
      setShowPlainContent(true);
      
      // Use the structured content from API response, or parse rawContent if needed
      let finalContent;
      if (response.data.content && response.data.content.h1) {
        // API already provided structured content, use it directly
        finalContent = response.data.content;
        console.log('Using structured content from API:', finalContent);
        
        // If H1 is missing from structured content but rawContent exists, try to extract it
        if ((!finalContent.h1 || finalContent.h1.trim() === '') && response.data.rawContent) {
          console.log('H1 missing from structured content, attempting to extract from rawContent');
          let h1Match = response.data.rawContent.match(/H1\s+Title:\s*([^\n]+)/i);
          if (!h1Match) {
            h1Match = response.data.rawContent.match(/^#\s+(.+)$/m);
          }
          if (!h1Match) {
            h1Match = response.data.rawContent.match(/Title:\s*([^\n]+)/i);
          }
          if (h1Match) {
            finalContent.h1 = h1Match[1].trim();
            console.log('Extracted H1 from rawContent:', finalContent.h1);
          }
        }
        
        // If FAQs are missing from structured content but rawContent exists, try to extract them
        if ((!finalContent.faqs || finalContent.faqs.length === 0) && response.data.rawContent) {
          console.log('FAQs missing from structured content, attempting to extract from rawContent');
          const faqMatch = response.data.rawContent.match(/FAQS:\s*\n([\s\S]*?)(?=\n\nCRITICAL REQUIREMENTS|$)/i);
          if (faqMatch) {
            const faqText = faqMatch[1];
            const faqLines = faqText.split('\n').filter(line => line.trim().startsWith('Q'));
            
            for (let i = 0; i < faqLines.length; i += 2) {
              if (faqLines[i] && faqLines[i + 1]) {
                let question = faqLines[i].replace(/^Q\d+:\s*/, '').trim();
                let answer = faqLines[i + 1].trim();
                
                if (!question || question.length === 0) {
                  question = faqLines[i].trim();
                }
                
                answer = answer.replace(/^\[?([^\]]+)\]?/, '$1').trim();
                
                if (question && answer && question !== answer) {
                  if (!finalContent.faqs) finalContent.faqs = [];
                  finalContent.faqs.push({ question, answer });
                }
              }
            }
            console.log('Extracted FAQs from rawContent:', finalContent.faqs);
          }
        }
      } else if (response.data.rawContent) {
        // Parse the raw content if no structured content provided
        finalContent = parseMarkedContent(response.data.rawContent);
        console.log('Parsed raw content:', finalContent);
      } else {
        // Fallback to empty content structure
        finalContent = {
          head: {
            title: '',
            meta: {
              description: ''
            }
          },
          body: {
            h1: '',
            intro: '',
            sections: [],
            faqs: []
          },
          identifier: {
            id: '',
            handle: formData.handle || generateHandle(formData.h1)
          },
          classification: {
            category: formData.category
          }
        };

        // Add location to meta if selected
        if (selectedLocation) {
          const locationData = availableLocations.find(loc => loc.placename === selectedLocation);
          if (locationData) {
            finalContent.head.meta.geo = {
              region: locationData.region,
              placename: locationData.placename,
              position: locationData.position
            };
          }
        }
      }
      
      // Set the content for display
      setGeneratedContent({
        ...response.data,
        content: finalContent
      });
      
      // Initialize editable meta fields
      initializeEditableMetaFields(finalContent);
      
      // Show notification if handle was modified
      if (response.data.handleModified) {
        toast.success(`Content generated successfully! Handle modified to: ${response.data.handle}`);
      } else {
        toast.success('Content generated successfully! Review the content below and save to database when ready.');
      }
      
      // Show notification about cleaned H2s if they were modified
      if (response.data.cleanedH2s && response.data.originalH2s) {
        const originalCount = response.data.originalH2s.length;
        const cleanedCount = response.data.cleanedH2s.length;
        if (originalCount !== cleanedCount) {
          toast.info(`H2 sections cleaned: ${originalCount} → ${cleanedCount} valid sections`);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      
      // Show more specific error messages
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Failed to generate content');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!generatedContent || !generatedContent.content) {
      toast.error('No content to save');
      return;
    }

    setSavingToDatabase(true);
    
    try {
      // Use the new save endpoint with the correct data structure
      const saveData = {
        plainContent: generatedContent.rawContent || generatedContent.content,
        h1: formData.h1,
        h2s: generatedContent.originalH2s || generatedContent.cleanedH2s || h2sArray,
        handle: formData.handle || generatedContent.handle || generateHandle(formData.h1),
        faqCount: generatedContent.faqCount || faqCount,
        location: selectedLocation ? availableLocations.find(loc => loc.placename === selectedLocation) : null,
        category: formData.category || 'general',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      const response = await axios.post('/api/generate/save', saveData);
      
      toast.success('Content saved to database successfully!');
      
      // Optionally redirect to content viewer
      // window.location.href = `/content/${response.data.public_id}`;
      
    } catch (error) {
      console.error('Error saving content:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Failed to save content to database');
      }
    } finally {
      setSavingToDatabase(false);
    }
  };

  // Test function to verify content parsing (for debugging)
  const testContentParsing = () => {
    const testData = {
      "success": true,
      "rawContent": "H1 Title: Open Ai\n\nH2 Sections:\n- open ai\n\nMETA TITLE:\nOpen AI: The Future of Artificial Intelligence\n\nMETA DESCRIPTION:\nExplore the groundbreaking world of Open AI, a leading AI research company. Discover its cutting-edge technologies, from large language models like GPT-3 to innovative AI solutions. Learn how Open AI is shaping the future of artificial intelligence and impacting various industries.\n\nINTRODUCTION:\nOpen AI is a pioneering artificial intelligence research company pushing the boundaries of what's possible with AI.  From natural language processing to computer vision, Open AI develops advanced AI models and technologies with the goal of benefiting humanity.  Their work is transforming industries and sparking important conversations about the future of AI.\n\n\nSECTION 1: open ai\nOpen AI conducts fundamental research in artificial intelligence, focusing on creating safe and beneficial general-purpose AI systems.  Their team of researchers and engineers tackle some of the most challenging problems in AI, from developing advanced algorithms to exploring the ethical implications of their work.  They believe that open collaboration and knowledge sharing are essential for responsible AI development.\n\nOpen AI is also committed to making its research and technology accessible to a wider audience.  They release many of their models and tools open-source, enabling developers and researchers worldwide to build upon their work.  This open approach fosters innovation and helps ensure that the benefits of AI are shared broadly.\n\nBULLET POINTS:\n• Develops advanced AI models like GPT-3 and DALL-E 2\n• Conducts fundamental research in artificial intelligence\n• Focuses on creating safe and beneficial general-purpose AI\n• Makes its research and technology accessible through open-source initiatives\n\nFAQS:\nQ1: What is Open AI's mission?\nOpen AI's core mission is to ensure that artificial general intelligence (AGI) benefits all of humanity.  They are dedicated to researching and developing advanced AI systems while prioritizing safety and ethical considerations.  Their work aims to create a future where AI is used for the betterment of society.\n",
      "handle": "open-ai",
      "message": "Content generated successfully. Review and save to database when ready.",
      "handleModified": false,
      "originalH2s": ["open ai"],
      "cleanedH2s": ["open ai"],
      "faqCount": 1,
      "content": {
        "head": {
          "title": "Open AI: The Future of Artificial Intelligence",
          "meta": {
            "description": "Explore the groundbreaking world of Open AI, a leading AI research company. Discover its cutting-edge technologies, from large language models like GPT-3 to innovative AI solutions. Learn how Open AI is shaping the future of artificial intelligence and impacting various industries.",
            "geo": {
              "region": "CA-ON",
              "placename": "Toronto",
              "position": "43.6532;-79.3832"
            }
          }
        },
        "body": {
          "h1": "",
          "intro": "Open AI is a pioneering artificial intelligence research company pushing the boundaries of what's possible with AI.  From natural language processing to computer vision, Open AI develops advanced AI models and technologies with the goal of benefiting humanity.  Their work is transforming industries and sparking important conversations about the future of AI.",
          "sections": [
            {
              "h2": "open ai",
              "paragraphs": [
                "Open AI conducts fundamental research in artificial intelligence, focusing on creating safe and beneficial general-purpose AI systems.  Their team of researchers and engineers tackle some of the most challenging problems in AI, from developing advanced algorithms to exploring the ethical implications of their work.  They believe that open collaboration and knowledge sharing are essential for responsible AI development.",
                "Open AI is also committed to making its research and technology accessible to a wider audience.  They release many of their models and tools open-source, enabling developers and researchers worldwide to build upon their work.  This open approach fosters innovation and helps ensure that the benefits of AI are shared broadly."
              ],
              "bullets": [
                "Develops advanced AI models like GPT-3 and DALL-E 2",
                "Conducts fundamental research in artificial intelligence",
                "Focuses on creating safe and beneficial general-purpose AI",
                "Makes its research and technology accessible through open-source initiatives"
              ]
            }
          ],
          "faqs": []
        },
        "identifier": {
          "id": "",
          "handle": "open-ai"
        },
        "classification": {
          "category": "Technology",
          "tags": ["artificial intelligence", "AI", "machine learning"]
        }
      }
    };

    console.log('=== TESTING CONTENT PARSING ===');
    console.log('Original content:', testData.content);
    
    // Test the parsing logic
    let finalContent;
    if (testData.content && testData.content.body && testData.content.body.h1) {
      finalContent = testData.content;
      console.log('Using structured content from API:', finalContent);
    } else if (testData.rawContent) {
      finalContent = parseMarkedContent(testData.rawContent);
      console.log('Parsed raw content:', finalContent);
    }
    
    // Test H1 extraction
    if ((!finalContent.body.h1 || finalContent.body.h1.trim() === '') && testData.rawContent) {
      console.log('H1 missing, attempting to extract from rawContent');
      let h1Match = testData.rawContent.match(/H1\s+Title:\s*([^\n]+)/i);
      if (!h1Match) {
        h1Match = testData.rawContent.match(/^#\s+(.+)$/m);
      }
      if (!h1Match) {
        h1Match = testData.rawContent.match(/Title:\s*([^\n]+)/i);
      }
      if (h1Match) {
        finalContent.body.h1 = h1Match[1].trim();
        console.log('✅ Extracted H1 from rawContent:', finalContent.body.h1);
      }
    }
    
    // Test FAQ extraction
    if ((!finalContent.body.faqs || finalContent.body.faqs.length === 0) && testData.rawContent) {
      console.log('FAQs missing, attempting to extract from rawContent');
      const faqMatch = testData.rawContent.match(/FAQS:\s*\n([\s\S]*?)(?=\n\nCRITICAL REQUIREMENTS|$)/i);
      if (faqMatch) {
        const faqText = faqMatch[1];
        const faqLines = faqText.split('\n').filter(line => line.trim().startsWith('Q'));
        
        for (let i = 0; i < faqLines.length; i += 2) {
          if (faqLines[i] && faqLines[i + 1]) {
            let question = faqLines[i].replace(/^Q\d+:\s*/, '').trim();
            let answer = faqLines[i + 1].trim();
            
            if (!question || question.length === 0) {
              question = faqLines[i].trim();
            }
            
            answer = answer.replace(/^\[?([^\]]+)\]?/, '$1').trim();
            
            if (question && answer && question !== answer) {
              if (!finalContent.body.faqs) finalContent.body.faqs = [];
              finalContent.body.faqs.push({ question, answer });
            }
          }
        }
        console.log('✅ Extracted FAQs from rawContent:', finalContent.body.faqs);
      }
    }
    
    console.log('=== FINAL PARSED CONTENT ===');
    console.log('H1:', finalContent.body.h1);
    console.log('FAQs count:', finalContent.body.faqs ? finalContent.body.faqs.length : 0);
    console.log('FAQs:', finalContent.body.faqs);
    
    return finalContent;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <Sparkles className="w-10 h-10 text-primary-600" />
          Generate AI Content
        </h1>
        <p className="text-xl text-gray-600">
          Create SEO-friendly, engaging content using Gemini AI
        </p>
      </div>

      {!generatedContent ? (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* H1 Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                H1 Title *
              </label>
              <input
                type="text"
                name="h1"
                value={formData.h1}
                onChange={handleInputChange}
                placeholder="e.g., Nail Design"
                className="input text-lg"
                required
              />
              
              {/* Handle Input - Editable and Real-time */}
              {formData.h1 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handle (URL-friendly)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="handle"
                      value={formData.handle || generateHandle(formData.h1)}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          handle: e.target.value
                        }));
                      }}
                      placeholder={generateHandle(formData.h1)}
                      className="input font-mono text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          handle: generateHandle(formData.h1)
                        }));
                      }}
                      className="btn btn-sm btn-outline px-3"
                      title="Reset to auto-generated handle"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This will be used for URL routing. You can edit it to make it more SEO-friendly.
                  </p>
                </div>
              )}

              {/* AI-Generated Meta Fields Info */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>SEO Optimization:</strong> Meta title and description will be automatically generated by AI for optimal search engine performance.
                </p>
                <div className="mt-2 text-xs text-blue-600 space-y-1">
                  <p>• <strong>Meta Title:</strong> 50-60 characters (optimal) | 30-60 characters (acceptable)</p>
                  <p>• <strong>Meta Description:</strong> 150-160 characters (optimal) | 120-160 characters (acceptable)</p>
                  <p>• Both fields include primary keywords and are optimized for click-through rates</p>
                </div>
              </div>
            </div>

            {/* Category Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input"
              >
                <option value="Nail">Nail</option>
                <option value="Gemstone">Gemstone</option>
              </select>
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="Enter tags separated by commas (e.g., gemstone beads, agate, natural stones)"
                className="input"
              />
              <p className="mt-1 text-sm text-gray-500">
                Add relevant tags separated by commas to help categorize your content.
              </p>
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (for local content)
              </label>
              <select
                name="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input"
              >
                <option value="">Select a location (optional)</option>
                {availableLocations.map((loc) => (
                  <option key={loc.placename} value={loc.placename}>
                    {loc.placename}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a location if your content is specific to a city or region.
              </p>
            </div>

            {/* H2 Sections Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                H2 Sections *
              </label>
              <textarea
                name="h2s"
                value={formData.h2s}
                onChange={handleInputChange}
                placeholder="Enter each H2 section on a new line:&#10;Types of Nail Designs&#10;Popular Nail Art Techniques&#10;Nail Care Tips&#10;Trending Nail Styles"
                className="input h-32 resize-none"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Each line will become a separate H2 section with 2 paragraphs and bullet points
              </p>
              
              {/* Proceed Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="btn btn-secondary w-full py-2 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Proceed & Clean H2 Sections
                </button>
                
                {/* Test Button for Debugging */}
                <button
                  type="button"
                  onClick={() => {
                    console.log('Testing cleaning with sample data...');
                    const testData = [
                      'nail salons near me​\nT\n22,200\n41\n0.48\n2 weeks',
                      'acrylic nails​\nC\n12,100\n39\n0.53\n2 weeks',
                      'nail​\nI\n12,100\n71\n0.66\n2 weeks'
                    ];
                    const cleaned = cleanH2Input(testData);
                    console.log('Test cleaning results:', cleaned);
                  }}
                  className="btn btn-sm btn-outline mt-2 w-full"
                >
                  Test Cleaning (Check Console)
                </button>
              </div>
              
              {/* Drag and Drop H2 Sections Preview */}
              {h2sArray.length > 0 && !showProcessedH2s && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    H2 Sections Preview (Drag to reorder):
                  </p>
                  <div className="space-y-2">
                    {h2sArray.map((h2, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition-colors ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </div>
                          <span className="text-gray-800">{h2}</span>
                          <div className="ml-auto text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Drag and drop to reorder sections. The order will be maintained when generating content.
                  </p>
                </div>
              )}

              {/* Processed H2 Sections Interface */}
              {showProcessedH2s && processedH2s.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">Processed H2 Sections</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addManualH2}
                        className="btn btn-sm btn-primary flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add H2
                      </button>
                      
                      {/* Test button for debugging */}
                      <button
                        type="button"
                        onClick={testContentParsing}
                        className="btn btn-sm btn-secondary"
                      >
                        Test Parsing
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {processedH2s.map((h2, index) => (
                      <div
                        key={h2.id}
                        draggable
                        onDragStart={(e) => handleProcessedDragStart(e, index)}
                        onDragOver={handleProcessedDragOver}
                        onDrop={(e) => handleProcessedDrop(e, index)}
                        onDragEnd={handleProcessedDragEnd}
                        className={`p-3 bg-white border border-blue-300 rounded-lg cursor-move hover:bg-blue-50 transition-colors ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-blue-500" />
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                              {h2.order + 1}
                            </div>
                          </div>
                          
                          <input
                            type="text"
                            value={h2.text}
                            onChange={(e) => updateH2Text(h2.id, e.target.value)}
                            className="flex-1 input input-sm border-blue-200 focus:border-blue-400"
                            placeholder="Enter H2 text..."
                          />
                          
                          <button
                            type="button"
                            onClick={() => toggleH2Type(h2.id)}
                            className={`btn btn-sm ${
                              h2.type === 'h2' ? 'btn-outline btn-primary' : 'btn-outline btn-secondary'
                            }`}
                          >
                            {h2.type.toUpperCase()}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => removeH2(h2.id)}
                            className="btn btn-sm btn-outline btn-error"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="mt-3 text-sm text-blue-700">
                    💡 Drag to reorder • Click H2/H3 to toggle • Add manual entries • Remove unwanted sections
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Count Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of FAQs
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={faqCount}
                onChange={(e) => setFaqCount(parseInt(e.target.value) || 20)}
                className="input w-full"
                placeholder="20"
              />
              <p className="mt-1 text-sm text-gray-500">
                Specify how many FAQs you want for this content (default: 20)
              </p>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-lg py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Content
                </>
              )}
            </button>
          </form>

          {/* What You'll Get */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              What You'll Get
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>✅ SEO-optimized title and structure</div>
              <div>✅ Engaging introduction paragraph</div>
              <div>✅ 2 paragraphs per H2 section</div>
              <div>✅ Key bullet points for each section</div>
              <div>✅ {faqCount} comprehensive FAQs</div>
              <div>✅ Professional content structure</div>
            </div>
          </div>
        </div>
      ) : (
        /* Generated Content Display */
        <div className="space-y-6">
          {/* Plain Content Review */}
          {showPlainContent && plainContent && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">AI Generated Content (Plain Text)</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPlainContent(false)}
                    className="btn btn-outline"
                  >
                    Back to Form
                  </button>
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={savingToDatabase}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {savingToDatabase ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving to Database...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Save to Database
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">Review & Save Workflow:</h3>
                <p className="text-sm text-blue-600">
                  1. Review the AI-generated content below<br/>
                  2. Make any necessary edits to the text<br/>
                  3. Click "Save to Database" to convert to structured format and save<br/>
                  4. The content will then be available in your content library
                </p>
              </div>

              {/* Plain Content Display */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Raw AI Response:</h3>
                <div className="whitespace-pre-wrap text-gray-700 font-mono text-sm leading-relaxed max-h-96 overflow-y-auto">
                  {plainContent.rawContent || plainContent.content || 'No content available'}
                </div>
              </div>

              {/* Content Stats */}
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Content Statistics:</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Characters:</span>
                    <span className="ml-2 font-medium">{(plainContent.rawContent || plainContent.content || '').length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Words:</span>
                    <span className="ml-2 font-medium">{(plainContent.rawContent || plainContent.content || '').split(/\s+/).length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Lines:</span>
                    <span className="ml-2 font-medium">{(plainContent.rawContent || plainContent.content || '').split('\n').length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">H2 Sections:</span>
                    <span className="ml-2 font-medium">{showProcessedH2s && processedH2s.length > 0 ? processedH2s.length : h2sArray.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reading Time:</span>
                    <span className="ml-2 font-medium">{Math.ceil((plainContent.rawContent || plainContent.content || '').split(/\s+/).length / 200)} min</span>
                  </div>
                </div>
              </div>

              {/* Parsed Content Structure Preview */}
              {(() => {
                try {
                  const contentText = plainContent.rawContent || plainContent.content;
                  if (!contentText) return null;
                  
                  const parsed = parseMarkedContent(contentText);
                  
                  return (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-green-700 mb-3">Parsed Content Structure Preview:</h3>
                      
                      {/* H1 */}
                      {parsed.h1 && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">H1:</span>
                          <span className="ml-2 text-sm text-green-800">{parsed.h1}</span>
                        </div>
                      )}
                      
                      {/* Intro */}
                      {parsed.intro && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Intro:</span>
                          <span className="ml-2 text-sm text-green-800">{parsed.intro.substring(0, 100)}...</span>
                        </div>
                      )}
                      
                      {/* Sections */}
                      {parsed.sections.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Sections:</span>
                          <span className="ml-2 text-sm text-green-800">{parsed.sections.length} sections</span>
                          <div className="mt-2 space-y-1">
                            {parsed.sections.map((section, index) => (
                              <div key={index} className="ml-4 text-xs text-green-700">
                                • {section.h2} ({section.paragraphs.length} paragraphs, {section.bullets.length} bullets)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* FAQs */}
                      {parsed.faqs.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">FAQs:</span>
                          <span className="ml-2 text-sm text-green-800">{parsed.faqs.length} questions</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-green-600 mt-2">
                        💡 This preview shows how your content will be structured when saved to the database.
                      </p>
                    </div>
                  );
                } catch (error) {
                  return (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-red-700 mb-2">Parsing Error:</h3>
                      <p className="text-xs text-red-600">Failed to parse content structure: {error.message}</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Content Preview */}
          {generatedContent && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Generated Content (Structured)</h2>
                <button
                  onClick={() => setGeneratedContent(null)}
                  className="btn btn-outline"
                >
                  Generate New Content
                </button>
              </div>

              {/* H1 */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {typeof formData.h1 === 'string' ? formData.h1 : 'Untitled'}
                </h1>
                <p className="text-gray-600 text-sm">
                  Handle: {typeof formData.h1 === 'string' ? generateHandle(formData.h1) : 'no-title'}
                </p>
              </div>

              {/* Editable Meta Fields */}
              {generatedContent.content && generatedContent.content.head && generatedContent.content.head.title && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-blue-700">Edit SEO Fields Before Saving:</h3>
                    {areMetaFieldsModified() && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        ✏️ Modified
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Title:</label>
                      <textarea
                        value={editableMetaTitle}
                        onChange={(e) => {
                          setEditableMetaTitle(e.target.value);
                          // Sync with structured content after a short delay
                          setTimeout(() => syncMetaFieldsWithContent(), 100);
                        }}
                        className="w-full p-3 border border-blue-300 rounded-lg text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Enter meta title..."
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${
                          editableMetaTitle.length >= 50 && editableMetaTitle.length <= 60
                            ? 'text-green-600'
                            : editableMetaTitle.length > 60
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          Length: {editableMetaTitle.length}/60 characters
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          editableMetaTitle.length >= 50 && editableMetaTitle.length <= 60
                            ? 'bg-green-200 text-green-800'
                            : editableMetaTitle.length > 60
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {editableMetaTitle.length >= 50 && editableMetaTitle.length <= 60
                            ? '✅ Optimal'
                            : editableMetaTitle.length > 60
                            ? '❌ Too Long'
                            : '⚠️ Too Short'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Optimal: 50-60 characters | Acceptable: 30-60 characters
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Meta Description:</label>
                      <textarea
                        value={editableMetaDescription}
                        onChange={(e) => {
                          setEditableMetaDescription(e.target.value);
                          // Sync with structured content after a short delay
                          setTimeout(() => syncMetaFieldsWithContent(), 100);
                        }}
                        className="w-full p-3 border border-blue-300 rounded-lg text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Enter meta description..."
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${
                          editableMetaDescription.length >= 150 && editableMetaDescription.length <= 160
                            ? 'text-green-600'
                            : editableMetaDescription.length > 160
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          Length: {editableMetaDescription.length}/160 characters
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          editableMetaDescription.length >= 150 && editableMetaDescription.length <= 160
                            ? 'bg-green-200 text-green-800'
                            : editableMetaDescription.length > 160
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {editableMetaDescription.length >= 150 && editableMetaDescription.length <= 160
                            ? '✅ Optimal'
                            : editableMetaDescription.length > 160
                            ? '❌ Too Long'
                            : '⚠️ Too Short'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Optimal: 150-160 characters | Acceptable: 120-160 characters
                      </p>
                    </div>
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-600">
                          💡 <strong>Tip:</strong> Edit these fields to optimize for SEO before saving to the database. 
                          The backend will automatically truncate them if they exceed the maximum lengths.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={syncMetaFieldsWithContent}
                            className={`btn btn-sm text-xs px-3 py-1 ${
                              areMetaFieldsModified() 
                                ? 'btn-primary' 
                                : 'btn-disabled opacity-50'
                            }`}
                            title="Save meta field changes to content structure"
                            disabled={!areMetaFieldsModified()}
                          >
                            {areMetaFieldsModified() ? '💾 Save Changes' : '✅ Saved'}
                          </button>
                          <button
                            type="button"
                            onClick={resetMetaFields}
                            className="btn btn-sm btn-outline text-xs px-3 py-1"
                            title="Reset to AI-generated values"
                          >
                            🔄 Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Structure Check */}
              {generatedContent.content && typeof generatedContent.content === 'object' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Content Structure:</strong> {(() => {
                      try {
                            if (generatedContent.content.body.h1 && typeof generatedContent.content.body.h1 === 'string') return `H1: ${generatedContent.content.body.h1}`;
    if (generatedContent.content.body.intro && typeof generatedContent.content.body.intro === 'string') return 'Has intro section';
    if (generatedContent.content.body.sections && Array.isArray(generatedContent.content.body.sections)) return `Has ${generatedContent.content.body.sections.length} sections`;
    if (generatedContent.content.body.faqs && Array.isArray(generatedContent.content.body.faqs)) return `Has ${generatedContent.content.body.faqs.length} FAQs`;
                        return 'Unknown structure';
                      } catch (error) {
                        return 'Error checking structure';
                      }
                    })()}
                  </p>
                </div>
              )}

              {/* Debug Info */}
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info:</h3>
                <p className="text-xs text-gray-600">Content ID: {safeRender(generatedContent.id)}</p>
                <p className="text-xs text-gray-600">Status: {safeRender(generatedContent.status)}</p>
                <p className="text-xs text-gray-600">Generated: {generatedContent.createdAt ? new Date(generatedContent.createdAt).toLocaleString() : 'N/A'}</p>
                <p className="text-xs text-gray-600">Has content: {generatedContent.content ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-600">Content type: {typeof generatedContent.content}</p>
                {generatedContent.content && (
                  <p className="text-xs text-gray-600">Content keys: {(() => {
                    try {
                      if (generatedContent.content && typeof generatedContent.content === 'object') {
                        const keys = Object.keys(generatedContent.content);
                        return keys.join(', ');
                      }
                      return 'N/A';
                    } catch (error) {
                      return 'Error getting keys';
                    }
                  })()}</p>
                )}
                <p className="text-xs text-gray-600">Has originalH2s: {generatedContent.originalH2s ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-600">Has cleanedH2s: {generatedContent.cleanedH2s ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-600">Content structure: {(() => {
                  try {
                        if (generatedContent.content && generatedContent.content.body && generatedContent.content.body.intro) {
      return typeof generatedContent.content.body.intro === 'string' ? 'Has intro' : 'Has intro (object)';
    }
                    return 'No intro';
                  } catch (error) {
                    return 'Error checking intro';
                  }
                })()}</p>
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer">Raw Data Structure</summary>
                  <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                    {JSON.stringify(generatedContent, null, 2)}
                  </pre>
                </details>
              </div>

              {/* H2 Processing Info */}
              {generatedContent.originalH2s && generatedContent.cleanedH2s && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">H2 Sections Processing:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-blue-600 mb-2">Original Input:</h4>
                      <div className="space-y-1">
                        {generatedContent.originalH2s.map((h2, index) => (
                          <div key={index} className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            {index + 1}. {safeRender(h2)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-green-600 mb-2">Cleaned & Used:</h4>
                      <div className="space-y-1">
                        {generatedContent.cleanedH2s.map((h2, index) => {
                          return (
                            <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                              {index + 1}. {safeRender(h2)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {generatedContent.originalH2s.length !== generatedContent.cleanedH2s.length && (
                    <p className="mt-2 text-xs text-blue-600">
                      ℹ️ {generatedContent.originalH2s.length - generatedContent.cleanedH2s.length} invalid sections were removed during processing.
                    </p>
                  )}
                </div>
              )}

              {/* Content Rendering with Error Boundary */}
              {(() => {
                try {
                  return (
                    <>
                      {/* Intro */}
                      {generatedContent.content && 
                       generatedContent.content.body.intro && 
                       typeof generatedContent.content.body.intro === 'string' && 
                       generatedContent.content.body.intro.trim() !== '' && (
                        <div className="mb-6">
                          <p className="text-lg text-gray-700 leading-relaxed">
                            {safeRender(generatedContent.content.body.intro)}
                          </p>
                        </div>
                      )}

                      {/* H2 Sections */}
                      {generatedContent.content && 
                       generatedContent.content.body.sections && 
                       Array.isArray(generatedContent.content.body.sections) && 
                       generatedContent.content.body.sections.map((section, index) => (
                        <div key={index} className="mb-8">
                          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            {safeRender(section.h2)}
                          </h2>
                          
                          {/* Paragraphs */}
                          {section.paragraphs && 
                           Array.isArray(section.paragraphs) && 
                           section.paragraphs.map((paragraph, pIndex) => (
                            <p key={pIndex} className="text-gray-700 mb-4 leading-relaxed">
                              {safeRender(paragraph)}
                            </p>
                          ))}
                          
                          {/* Bullet Points */}
                          {section.bullets && 
                           Array.isArray(section.bullets) && 
                           section.bullets.length > 0 && (
                            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                              {section.bullets.map((bullet, bIndex) => (
                                <li key={bIndex}>
                                  {safeRender(bullet)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      {/* FAQs */}
                      {generatedContent.content && 
                       generatedContent.content.body.faqs && 
                       Array.isArray(generatedContent.content.body.faqs) && 
                       generatedContent.content.body.faqs.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <details className="group">
                            <summary className="text-2xl font-semibold text-gray-900 mb-4 cursor-pointer list-none flex items-center gap-2 hover:text-gray-700">
                              <span>Frequently Asked Questions</span>
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {generatedContent.content.body.faqs.length} FAQs
                              </span>
                              <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="space-y-4 mt-4">
                              {generatedContent.content.body.faqs.map((faq, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                  <h3 className="font-semibold text-gray-900 mb-2 flex items-start gap-2">
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-[2rem] text-center">
                                      {index + 1}
                                    </span>
                                    {safeRender(faq.question)}
                                  </h3>
                                  <p className="text-gray-700 ml-12">
                                    {safeRender(faq.answer)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Fallback: If content structure is different than expected */}
                      {generatedContent.content && 
                       (!generatedContent.content.body.intro && 
                        !generatedContent.content.body.sections && 
                        !generatedContent.content.body.faqs) && (
                        <div className="mt-8 pt-6 border-t border-yellow-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Structure Issue</h3>
                          <p className="text-gray-600 mb-4">
                            The content structure is different than expected. Please check the debug info above for details.
                          </p>
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Note:</strong> The expected structure should have intro, sections, and FAQs directly under content.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                } catch (error) {
                  console.error('Error rendering content:', error);
                  return (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800">
                        <strong>Error rendering content:</strong> {error.message}
                      </p>
                      <p className="text-sm text-red-600 mt-2">
                        Please check the debug info above for details about the content structure.
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;

