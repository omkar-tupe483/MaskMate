// ⚠️  ALL DATA IN THIS FILE IS ENTIRELY FICTITIOUS AND COMPUTER-GENERATED.
// No real person, Aadhaar number, PAN, card number, email, or phone is represented.
// Aadhaar-like strings are synthetic test vectors; they are NOT real UIDAI-issued numbers.
// Card numbers use reserved/test BIN ranges and do not correspond to any real account.
// This sample exists solely to demonstrate PII-detection capability in a sandboxed UI.

export const SAMPLE_NOISY_TEXT = `======================================================================
[FICTITIOUS TEST DATA — NOT REAL PII — FOR DEMO PURPOSES ONLY]
SUPPORT ESCALATION & BILLING LOG — CLINIC OPS DESK
Timestamp: 2026-11-27T10:15:42Z | Order Ref: ORD-9876543210
======================================================================

[CUSTOMER & CONTACT RECORDS]
Primary Email: priya.sharma@finserve.in
Secondary Alert: PRIYA.SHARMA@FINSERVE.IN (repeat in uppercase)
Audit Contact: ops-desk@healthgrid.co.in

Phone Numbers:
- Indian Mobile: +91 98765 43210
- STD / Zero Prefix: 09876543210
- Hyphenated Mobile: 98765-43210
- US Escalation: +1 (415) 555-0192
- UK Office: +44 20 7946 0958

[IDENTITY & TAX DOCUMENTS — ALL FICTITIOUS]
PAN Numbers (fictitious — format only):
- Standard PAN: ABCDE1234F
- Corporate PAN: AAACA9988G

Aadhaar-format Numbers (fictitious test vectors, NOT real UIDAI numbers):
- Spaced format:      3675 9834 6016
- Compact format:     987654321096
- Hyphenated format:  2198-4738-2910
- Invalid checksum decoy: 3675 9834 6019 (must be rejected by Verhoeff algorithm)

[PAYMENT CARDS — TEST RANGES ONLY, NOT REAL ACCOUNTS]
Test Card Numbers (Luhn-valid, reserved test BINs):
- Test Visa range:       4000-0000-0000-0002
- Test Mastercard range: 5105 1051 0510 5100
- Test Amex range:       3714-496353-98431
- Test Discover range:   6011-0009-9013-9424

Decoy 16-Digit Numbers (FAIL Luhn — must NOT be flagged):
- Bait 1: 4111 1111 1111 1112
- Bait 2: 5555-5555-5555-5555
- Bait 3: 9999888877776666

[NETWORK TELEMETRY — FICTITIOUS]
- Gateway IPv4: 192.168.1.105
- Internal Proxy: 10.0.0.1
- Invalid IPv4 Decoy: 192.168.1.256 (octet > 255, must NOT be flagged)
- Cluster IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- Compressed IPv6: fe80::1ff:fe23:4567:890a

Summary: Confirm priya.sharma@finserve.in paid via 4000-0000-0000-0002 for PAN ABCDE1234F.
[END OF FICTITIOUS TEST DATA]
`;

