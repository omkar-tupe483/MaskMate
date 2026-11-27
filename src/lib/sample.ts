export const SAMPLE_NOISY_TEXT = `======================================================================
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

[IDENTITY & TAX DOCUMENTS]
PAN Numbers:
- Standard PAN: ABCDE1234F
- Corporate PAN: AAACA9988G

Aadhaar Numbers (12 digits, Verhoeff-checked):
- Spaced Aadhaar: 3675 9834 6016
- Plain Aadhaar: 987654321096
- Hyphenated Aadhaar: 2198-4738-2910
- Invalid Verhoeff Decoy: 3675 9834 6019 (must be rejected by Verhoeff)

[PAYMENT CARDS & DECOY BAIT]
Valid Luhn Credit Cards:
- Visa: 4532-0150-1234-5671
- Mastercard: 5425 2334 3010 9119
- Amex: 3782-822463-10005
- Discover / RuPay: 6011-1111-1111-1117

Decoy 16-Digit Numbers (FAIL Luhn — must NOT be flagged):
- Bait 1: 4111 1111 1111 1112
- Bait 2: 5555-5555-5555-5555
- Bait 3: 9999888877776666

[NETWORK TELEMETRY]
- Gateway IPv4: 192.168.1.105
- Internal Proxy: 10.0.0.1
- Invalid IPv4 Decoy: 192.168.1.256 (octet > 255, must NOT be flagged)
- Cluster IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- Compressed IPv6: fe80::1ff:fe23:4567:890a

Summary: Confirm priya.sharma@finserve.in paid via 4532-0150-1234-5671 for PAN ABCDE1234F.
`;

