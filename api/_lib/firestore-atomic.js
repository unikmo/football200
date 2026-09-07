const { getAccessToken, getFirebaseConfig, encodeFields } = require('./firebase');

function safePart(value, label) {
  const text = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(text)) throw new Error(`Invalid ${label}`);
  return text;
}

function documentName(collection, documentId) {
  const { projectId, databaseId } = getFirebaseConfig();
  return `projects/${projectId}/databases/${databaseId}/documents/${safePart(collection, 'collection')}/${safePart(documentId, 'document id')}`;
}

function createWrite(collection, documentId, data) {
  return {
    update: { name: documentName(collection, documentId), fields: encodeFields(data) },
    currentDocument: { exists: false },
  };
}

function updateFieldsWrite(collection, documentId, data, updateTime) {
  const fields = Object.keys(data || {});
  if (!fields.length) throw new Error('No fields supplied');
  return {
    update: { name: documentName(collection, documentId), fields: encodeFields(data) },
    updateMask: { fieldPaths: fields },
    currentDocument: updateTime ? { updateTime } : { exists: true },
  };
}

async function commitWrites(writes) {
  const token = await getAccessToken();
  const { projectId, databaseId } = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:commit`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ writes }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Firestore commit failed (${response.status})`);
    error.code = 'FIRESTORE_COMMIT_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

module.exports = { documentName, createWrite, updateFieldsWrite, commitWrites };
