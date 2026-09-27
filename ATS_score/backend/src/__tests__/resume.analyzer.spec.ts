/**
 * Unit tests for the ATS resume analyzer scoring logic.
 */
import { Test } from '@nestjs/testing';
import { AnalyzerService } from '../modules/resume/analyzer.service';

describe('AnalyzerService', () => {
  let service: AnalyzerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AnalyzerService],
    }).compile();
    service = module.get<AnalyzerService>(AnalyzerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze()', () => {
    const REACT_RESUME = `
      John Doe | React Developer
      Skills: React, TypeScript, Redux, Webpack, Jest, REST APIs, Git, Node.js
      Experience: 3 years building single-page applications using React and TypeScript.
      Increased performance by 40% through code splitting and lazy loading.
      Education: B.Sc. Computer Science
    `;

    it('returns a score between 0 and 100', () => {
      const result = service.analyze(REACT_RESUME, 'React');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('detects matched keywords from domain', () => {
      const result = service.analyze(REACT_RESUME, 'React');
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
      expect(result.matchedKeywords.map((k: string) => k.toLowerCase())).toEqual(
        expect.arrayContaining(['react']),
      );
    });

    it('gives a low score for an empty resume', () => {
      const result = service.analyze('', 'React');
      expect(result.score).toBeLessThan(30);
    });

    it('identifies missing keywords for domain', () => {
      const result = service.analyze('John Doe, developer', 'Node.js');
      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });
  });
});
