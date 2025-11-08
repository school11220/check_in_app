import axios from 'axios';
import crypto from 'crypto';

const PHONEPE_API_URL = process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

if (!MERCHANT_ID || !SALT_KEY) {
  throw new Error('PhonePe credentials not configured. Please set PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY in .env');
}

/**
 * Generate SHA256 checksum for PhonePe API
 */
export function generateChecksum(payload: string): string {
  const checksumString = payload + '/pg/v1/pay' + SALT_KEY;
  const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');
  return checksum + '###' + SALT_INDEX;
}

/**
 * Verify PhonePe callback checksum
 */
export function verifyChecksum(receivedChecksum: string, payload: string): boolean {
  const checksumString = payload + SALT_KEY;
  const calculatedChecksum = crypto.createHash('sha256').update(checksumString).digest('hex');
  const receivedChecksumValue = receivedChecksum.split('###')[0];
  return calculatedChecksum === receivedChecksumValue;
}

/**
 * Create PhonePe payment request
 * NOTE: Using MOCK mode for testing. For production, get real PhonePe credentials.
 */
export async function createPhonePePayment(data: {
  ticketId: string;
  amount: number; // Amount in paise (200 rupees = 20000 paise)
  name: string;
  email?: string;
  phone?: string;
}) {
  // MOCK MODE - For testing without real PhonePe credentials
  // TODO: Replace with real PhonePe API when you have production credentials
  
  console.log('🧪 MOCK PAYMENT MODE - Simulating PhonePe payment...');
  console.log(`Ticket ID: ${data.ticketId}, Amount: ₹${data.amount / 100}`);
  
  // Simulate payment page URL
  const mockPaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mock-payment?ticketId=${data.ticketId}&amount=${data.amount}`;
  
  return {
    success: true,
    paymentUrl: mockPaymentUrl,
    transactionId: data.ticketId,
  };
  
  /* REAL PHONEPE IMPLEMENTATION (Uncomment when you have real credentials):
  
  try {
    // Create payment payload
    const paymentPayload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: data.ticketId,
      merchantUserId: `USER_${Date.now()}`,
      amount: data.amount,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/phonepe/callback`,
      redirectMode: 'POST',
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/phonepe/callback`,
      mobileNumber: data.phone || '9999999999',
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    // Encode payload to base64
    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    // Generate checksum
    const checksum = generateChecksum(base64Payload);

    // Make API request to PhonePe
    const response = await axios.post(
      `${PHONEPE_API_URL}/pg/v1/pay`,
      {
        request: base64Payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        transactionId: data.ticketId,
      };
    } else {
      throw new Error(response.data.message || 'Payment initiation failed');
    }
  } catch (error: any) {
    console.error('PhonePe payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create payment');
  }
  */
}

/**
 * Check PhonePe payment status
 */
export async function checkPaymentStatus(transactionId: string) {
  try {
    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${transactionId}`;
    const checksumString = endpoint + SALT_KEY;
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + SALT_INDEX;

    const response = await axios.get(`${PHONEPE_API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID,
      },
    });

    return {
      success: response.data.success,
      status: response.data.code,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('PhonePe status check error:', error.response?.data || error.message);
    throw new Error('Failed to check payment status');
  }
}
