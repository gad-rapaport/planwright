import { describe, expect, it } from 'vitest';
import { escapeCell, toCsv } from '../../src/io/csv';

describe('CSV formula-injection protection', () => {
  it.each([
    ['=HYPERLINK("http://example.invalid","x")', `"'=HYPERLINK(""http://example.invalid"",""x"")"`],
    ['+1+1', "'+1+1"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tcmd', "'\tcmd"],
    ['\rcmd', '"\'\rcmd"'],
  ])('neutralises %j', (input, expected) => {
    expect(escapeCell(input)).toBe(expected);
  });

  it('keeps numbers numeric, including negatives', () => {
    expect(escapeCell(-1200)).toBe('-1200');
    expect(escapeCell(0.5)).toBe('0.5');
    expect(escapeCell(Number.NaN)).toBe('');
    expect(escapeCell(null)).toBe('');
  });

  it('quotes commas, quotes, line breaks and edge spaces', () => {
    expect(escapeCell('Rent, main unit')).toBe('"Rent, main unit"');
    expect(escapeCell('5" pipe')).toBe('"5"" pipe"');
    expect(escapeCell('two\nlines')).toBe('"two\nlines"');
    expect(escapeCell(' padded ')).toBe('" padded "');
    expect(escapeCell('Plain')).toBe('Plain');
  });

  it('writes a BOM and CRLF line ends', () => {
    expect(
      toCsv([
        ['a', 1],
        ['b', null],
      ]),
    ).toBe('﻿a,1\r\nb,\r\n');
  });
});
