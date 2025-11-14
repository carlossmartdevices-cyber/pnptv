#!/usr/bin/env node

/**
 * Firestore Indexes Setup Script
 * Generates firestore.indexes.json for required composite indexes
 */

const fs = require('fs');
const path = require('path');

const indexes = {
  indexes: [
    // Event reminders index (CRITICAL - currently disabled)
    {
      collectionGroup: 'event_reminders',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'reminderTime', order: 'ASCENDING' },
      ],
    },
    // User active index
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'lastActive', order: 'DESCENDING' },
      ],
    },
    // Payments by status and date
    {
      collectionGroup: 'payments',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    // Active plan activations
    {
      collectionGroup: 'plan_activations',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiresAt', order: 'ASCENDING' },
      ],
    },
    // Plan activations by user
    {
      collectionGroup: 'plan_activations',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    },
    // User playlists
    {
      collectionGroup: 'playlists',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    // Music by genre
    {
      collectionGroup: 'music',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'genre', order: 'ASCENDING' },
        { fieldPath: 'plays', order: 'DESCENDING' },
      ],
    },
    // Music search terms
    {
      collectionGroup: 'music',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'searchTerms', arrayConfig: 'CONTAINS' },
        { fieldPath: 'plays', order: 'DESCENDING' },
      ],
    },
    // Events by date
    {
      collectionGroup: 'events',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'startTime', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    },
    // User locations for nearby search
    {
      collectionGroup: 'user_locations',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'geohash', order: 'ASCENDING' },
        { fieldPath: 'updatedAt', order: 'DESCENDING' },
      ],
    },
    // Group engagement leaderboard
    {
      collectionGroup: 'group_engagement',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'groupId', order: 'ASCENDING' },
        { fieldPath: 'points', order: 'DESCENDING' },
      ],
    },
  ],
  fieldOverrides: [],
};

function generateIndexFile() {
  console.log('🔧 Generating Firestore indexes configuration...\n');

  const outputPath = path.join(process.cwd(), 'firestore.indexes.json');

  fs.writeFileSync(outputPath, JSON.stringify(indexes, null, 2));

  console.log('✅ Generated firestore.indexes.json');
  console.log(`   Location: ${outputPath}\n`);

  console.log('📝 Next steps:');
  console.log('   1. Deploy indexes to Firestore:');
  console.log('      firebase deploy --only firestore:indexes\n');
  console.log('   2. Or manually create in Firebase Console:');
  console.log('      https://console.firebase.google.com/project/_/firestore/indexes\n');

  console.log('⚠️  IMPORTANT:');
  console.log('   After deploying indexes, update .env:');
  console.log('   DISABLE_REMINDER_CRON=false\n');

  // Generate deployment script
  const deployScriptPath = path.join(process.cwd(), 'scripts', 'deploy-indexes.sh');
  const deployScript = `#!/bin/bash
#
# Deploy Firestore Indexes
#

set -e

echo "🚀 Deploying Firestore indexes..."

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not installed!"
    echo "   Install: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase..."
    firebase login
fi

# Deploy indexes
firebase deploy --only firestore:indexes

echo "✅ Indexes deployed successfully!"
echo ""
echo "⚠️  Note: Index creation may take several minutes."
echo "   Monitor progress in Firebase Console:"
echo "   https://console.firebase.google.com/project/_/firestore/indexes"
`;

  fs.writeFileSync(deployScriptPath, deployScript);
  fs.chmodSync(deployScriptPath, '755');

  console.log('📄 Also created deployment script:');
  console.log(`   ${deployScriptPath}`);
  console.log('   Run: ./scripts/deploy-indexes.sh\n');
}

if (require.main === module) {
  generateIndexFile();
}

module.exports = generateIndexFile;
