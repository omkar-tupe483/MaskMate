/**
 * Realistic messy sample text containing all target entity types,
 * edge cases, repeated values with varied cases, valid and invalid checks,
 * plus false-positive bait (Luhn-failing 16 digits, order numbers, timestamps).
 */
export const SAMPLE_NOISY_TEXT = `================================================================================
PATIENT INTAKE & SUPPORT INCIDENT TICKET - HOSPITAL LOGISTICS PLATFORM
Report Generated: 2026-11-27T10:14:35Z | Server Instance: PROD-SRV-99
Incident Reference: ORD-9876543210 (DO NOT MODIFY ORDER REF)
================================================================================

[PATIENT DETAILS & BILLING CONTACT]
Primary Contact: Omkar Deshmukh
Primary Email: omkar.deshmukh@healthcare.org
Alternative Email: OMKAR.DESHMUKH@HEALTHCARE.ORG (verify case insensitivity)
Escalation Contact: support.lead@medicare-solutions.co.in

Contact Numbers:
- Indian Mobile: +91 98765 43210
- Landline with 0: 09876543210
- Alternate Mobile: 98765-43210
- International Emergency: +1 (555) 234-5678
- Regional Office: +44 20 7946 0958

[GOVERNMENT IDENTIFICATION]
PAN Records:
- Valid Individual PAN: ABCPE1234F (Fourth char 'P' for Individual)
- Valid Company PAN: AAACA9988G (Fourth char 'C' for Company)
- Invalid PAN format: ABCPE12345 (Invalid last character, must NOT match PAN)
- Invalid PAN holder: XYZKE1234P (Fourth char 'K' is invalid holder code)

Aadhaar Records (UIDAI Verhoeff Checksum):
- Valid Aadhaar (Hyphenated): 9876-5432-1096
- Valid Aadhaar (Spaced): 3675 9834 6016
- Valid Aadhaar (Plain): 219847382910
- Invalid Aadhaar Checksum: 3675 9834 6019 (Fails Verhoeff checksum)
- Invalid Aadhaar Starting with 0: 0123 4567 8901 (Must NOT match Aadhaar)

[PAYMENT & TRANSACTION CO-PAY RECORDS]
Valid Credit Cards (Must be detected via Luhn check):
- Visa: 4532-0150-1234-5671 (Luhn Valid)
- Mastercard: 5425 2334 3010 9119 (Luhn Valid)
- Amex: 3782-822463-10005 (Luhn Valid)
- RuPay/Discover: 6011-1111-1111-1117 (Luhn Valid)

False-Positive Bait (Must NOT be flagged as Credit Card):
- Luhn Failure Bait 1: 4111 1111 1111 1112 (Fails Luhn test)
- Luhn Failure Bait 2: 5555-5555-5555-5555 (Fails Luhn test)
- Random 16-digit sequence: 9999888877776666 (Fails Luhn test)

Non-PII System Strings (Must NOT be flagged):
- Tracking ID: TXN_987654321098
- Build Version: v2026.11.27.1030
- Order Number: ORD#9876543210

[NETWORK LOGS & CLUSTER NODES]
Connection established from client:
- Public Gateway IPv4: 192.168.1.105
- Edge Proxy IPv4: 10.0.0.1
- Invalid IPv4 (Out of bounds octet): 192.168.1.256 (Must NOT match IP)
- Core Node IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- Compressed IPv6: fe80::1ff:fe23:4567:890a
- Loopback: ::1

Summary Note:
Patient omkar.deshmukh@healthcare.org authorized copay deduction with card 4532-0150-1234-5671.
Kindly verify PAN ABCPE1234F against Aadhaar 9876-5432-1096.
`;
