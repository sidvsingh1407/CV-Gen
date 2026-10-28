import React, { useState, useEffect, useCallback } from 'react';
import { CvDraftOutput, DraftItem, DraftSection } from '@/lib/schemas/cvDraft';
import { FactCheckResult } from '@/lib/schemas/factCheck';
import { Button } from './Button';
import { ExportControls } from './ExportControls';
import { v4 as uuidv4 } from 'uuid';

export interface CvEditorProps {
  initialDraft: CvDraftOutput;
}

export const CvEditor: React.FC<CvEditorProps> = ({ initialDraft }) => {
  const [draft, setDraft] = useState<CvDraftOutput>(initialDraft);
  const [history, setHistory] = useState<CvDraftOutput[]>([initialDraft]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);

  // Approximate character count per page logic
  const charsPerPage = 3000;

  const getVisibleTextLength = useCallback(() => {
    let length = 0;
    if (draft.header) {
      length += Object.values(draft.header).join(' ').length;
    }
    draft.sections.forEach(sec => {
      if (!hiddenSections.has(sec.sectionId)) {
        length += sec.heading.length;
        sec.items.forEach(item => {
          if (!hiddenItems.has(item.id)) {
            length += item.text.length;
            if (item.title) length += item.title.length;
            if (item.organization) length += item.organization.length;
          }
        });
      }
    });
    return length;
  }, [draft, hiddenSections, hiddenItems]);

  const estimatedPages = Math.max(1, Math.ceil(getVisibleTextLength() / charsPerPage));

  const saveHistory = (newDraft: CvDraftOutput) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDraft);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateDraft = (newDraft: CvDraftOutput) => {
    setDraft(newDraft);
    saveHistory(newDraft);
    setFactCheckResult(null); // Invalidate previous result
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDraft(history[historyIndex - 1]);
      setFactCheckResult(null); // Result might not match the undone state precisely in our simple model
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDraft(history[historyIndex + 1]);
      setFactCheckResult(null);
    }
  };

  const handleItemTextChange = (sectionId: string, itemId: string, newText: string) => {
    const newSections = draft.sections.map(sec => {
      if (sec.sectionId === sectionId) {
        return {
          ...sec,
          items: sec.items.map(item => {
            if (item.id === itemId) {
              return { ...item, text: newText, verificationStatus: 'unverified' as const };
            }
            return item;
          })
        };
      }
      return sec;
    });

    updateDraft({ ...draft, sections: newSections });
  };

  const toggleSectionVisibility = (sectionId: string) => {
    const newHidden = new Set(hiddenSections);
    if (newHidden.has(sectionId)) newHidden.delete(sectionId);
    else newHidden.add(sectionId);
    setHiddenSections(newHidden);
  };

  const toggleItemVisibility = (itemId: string) => {
    const newHidden = new Set(hiddenItems);
    if (newHidden.has(itemId)) newHidden.delete(itemId);
    else newHidden.add(itemId);
    setHiddenItems(newHidden);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newSections = [...draft.sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      updateDraft({ ...draft, sections: newSections });
    } else if (direction === 'down' && index < draft.sections.length - 1) {
      const newSections = [...draft.sections];
      [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
      updateDraft({ ...draft, sections: newSections });
    }
  };

  const moveItem = (sectionId: string, itemIndex: number, direction: 'up' | 'down') => {
    const newSections = draft.sections.map(sec => {
      if (sec.sectionId === sectionId) {
        const newItems = [...sec.items];
        if (direction === 'up' && itemIndex > 0) {
          [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]];
        } else if (direction === 'down' && itemIndex < newItems.length - 1) {
          [newItems[itemIndex + 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex + 1]];
        }
        return { ...sec, items: newItems };
      }
      return sec;
    });
    updateDraft({ ...draft, sections: newSections });
  };

  const runFactCheck = async () => {
    setIsChecking(true);
    setFactCheckError(null);
    try {
      // Create a filtered draft that only contains visible items so fact checker checks what will be exported
      const draftToCheck = {
        ...draft,
        sections: draft.sections
          .filter(sec => !hiddenSections.has(sec.sectionId))
          .map(sec => ({
            ...sec,
            items: sec.items.filter(item => !hiddenItems.has(item.id))
          }))
      };

      const res = await fetch('/api/cv/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftToCheck })
      });

      if (!res.ok) {
         if (res.status === 401) {
           throw new Error("Unauthorized");
         }
         throw new Error("Fact check request failed.");
      }

      const result = await res.json();
      setFactCheckResult(result);
    } catch (err: any) {
      setFactCheckError(err.message || "Failed to run fact check.");
    } finally {
      setIsChecking(false);
    }
  };

  // The final exported draft should only contain visible items.
  const exportedDraft = {
    ...draft,
    sections: draft.sections
      .filter(sec => !hiddenSections.has(sec.sectionId))
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => !hiddenItems.has(item.id))
      }))
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center bg-white p-4 shadow rounded">
        <h1 className="text-2xl font-bold">CV Editor</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Estimated Pages: {estimatedPages} (rough estimate)
          </div>
          <Button onClick={handleUndo} disabled={historyIndex === 0} variant="outline">Undo</Button>
          <Button onClick={handleRedo} disabled={historyIndex === history.length - 1} variant="outline">Redo</Button>
        </div>
      </div>

      <div className="bg-white p-6 shadow rounded space-y-6">
        {draft.header && (
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold">{draft.header.fullName}</h2>
            <p className="text-gray-600">
              {draft.header.email} {draft.header.phone && `| ${draft.header.phone}`}
            </p>
          </div>
        )}

        {draft.sections.map((section, sIndex) => (
          <div key={section.sectionId} className={`p-4 border rounded ${hiddenSections.has(section.sectionId) ? 'opacity-50 bg-gray-50' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold capitalize">{section.heading}</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => moveSection(sIndex, 'up')} disabled={sIndex === 0}>↑</Button>
                <Button variant="outline" onClick={() => moveSection(sIndex, 'down')} disabled={sIndex === draft.sections.length - 1}>↓</Button>
                <Button variant="outline" onClick={() => toggleSectionVisibility(section.sectionId)}>
                  {hiddenSections.has(section.sectionId) ? 'Restore Section' : 'Hide Section'}
                </Button>
              </div>
            </div>

            {!hiddenSections.has(section.sectionId) && (
              <div className="space-y-4">
                {section.items.map((item, iIndex) => (
                  <div key={item.id} className={`flex flex-col gap-2 p-2 border-l-4 ${hiddenItems.has(item.id) ? 'border-gray-300 opacity-50 bg-gray-50' : 'border-blue-500'}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-1">
                        {(item.title || item.organization || item.dateString) && (
                          <div className="text-sm font-medium text-gray-700">
                            {item.title} {item.organization && `at ${item.organization}`} {item.dateString && `(${item.dateString})`}
                          </div>
                        )}
                        <textarea
                          className="w-full p-2 border rounded resize-y"
                          value={item.text}
                          onChange={(e) => handleItemTextChange(section.sectionId, item.id, e.target.value)}
                          disabled={hiddenItems.has(item.id)}
                          rows={2}
                        />
                        {item.verificationStatus === 'unverified' && (
                           <span className="text-xs text-orange-500 font-semibold">Unverified Edit</span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" onClick={() => moveItem(section.sectionId, iIndex, 'up')} disabled={iIndex === 0 || hiddenItems.has(item.id)}>↑</Button>
                        <Button variant="outline" onClick={() => moveItem(section.sectionId, iIndex, 'down')} disabled={iIndex === section.items.length - 1 || hiddenItems.has(item.id)}>↓</Button>
                        <Button variant="outline" onClick={() => toggleItemVisibility(item.id)}>
                          {hiddenItems.has(item.id) ? 'Restore' : 'Hide'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white p-6 shadow rounded space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-semibold">Fact Check & Export</h3>
           <Button onClick={runFactCheck} disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Run Fact Check'}
           </Button>
        </div>

        {factCheckError && (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            {factCheckError}
          </div>
        )}

        {factCheckResult && (
          <div className={`p-4 rounded border ${factCheckResult.status === 'passed' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <h4 className="font-semibold mb-2">Status: {factCheckResult.status.toUpperCase()}</h4>
            {factCheckResult.issues.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {factCheckResult.issues.map(issue => (
                  <li key={issue.id}>
                    <strong>{issue.severity.toUpperCase()}:</strong> {issue.explanation}
                    {issue.recommendedAction && <span className="block text-gray-600">Action: {issue.recommendedAction}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {factCheckResult?.status === 'passed' ? (
          <ExportControls draft={exportedDraft} />
        ) : (
          <div className="p-4 bg-gray-100 text-gray-600 rounded text-sm text-center border border-gray-200">
            Export is disabled until the draft passes the fact check. Please review edits and run the fact check.
          </div>
        )}
      </div>
    </div>
  );
};
