export const supportContact = {
  email: 'miraaqib514@gmail.com',
  phone: '+91 9596523404',
  location: 'Kupwara, Jammu & Kashmir, India',
};

export function normalizeSupportPhone(phone: string): string | null {
  const compact = phone.replace(/[\s()-]/g, '');
  const match = /^(?:\+?91)?([6-9]\d{9})$/.exec(compact);
  return match ? `+91${match[1]}` : null;
}

export const supportPhone = normalizeSupportPhone(supportContact.phone);
