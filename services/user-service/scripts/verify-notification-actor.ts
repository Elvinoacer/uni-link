
import { prisma } from '../src/lib/prisma';
import { NotificationService } from '../src/services/notification.service';

async function main() {
  console.log('Starting Notification Enrichment Verification...');

  // 1. Get two users to act as Actor and Recipient
  const users = await prisma.user.findMany({ take: 2 });
  if (users.length < 2) {
    console.error('Need at least 2 users in DB to test');
    return;
  }

  const actor = users[0];
  const recipient = users[1];

  if (!actor || !recipient) {
      console.error('Failed to get actor or recipient');
      return;
  }

  console.log(`Actor: ${actor.username} (${actor.id})`);
  console.log(`Recipient: ${recipient.username} (${recipient.id})`);

  const service = new NotificationService();

  // 2. Create a test notification with actorId
  console.log('\nCreating notification with actorId...');
  const notif = await service.createNotification({
    userId: recipient.id,
    type: 'like',
    title: 'Test Like',
    content: 'Someone liked your post',
    entityId: 'test-entity-id-' + Date.now(),
    entityType: 'post',
    actorId: actor.id
  });

  if (!notif) {
      console.error('Failed to create notification');
      return;
  }
  console.log('Notification created ID:', notif.id);

  // 3. Inspect the raw DB record
  const rawRecord = await prisma.notification.findUnique({ where: { id: notif.id } });
  console.log('\nRaw DB Record Metadata:', rawRecord?.metadata);

  // 4. Fetch notifications via service (which should enrich)
  console.log('\nFetching notifications via service...');
  const result = await service.getNotifications(recipient.id, 1, 1);
  const fetchedNotif = result.notifications[0];

  if (!fetchedNotif) {
      console.error('Failed to fetch notification back');
      return;
  }

  console.log('\nFetched Notification Result:');
  console.log('ID:', fetchedNotif.id);
  console.log('Title:', fetchedNotif.title);
  // @ts-ignore
  console.log('Actor Field Present?', !!fetchedNotif.actor);
  // @ts-ignore
  if (fetchedNotif.actor) {
       // @ts-ignore
      console.log('Actor Username:', fetchedNotif.actor.username);
       // @ts-ignore
      console.log('Actor Avatar:', fetchedNotif.actor.avatarUrl);
  } else {
      console.error('FAIL: Actor field is missing!');
  }

  // Cleanup
  await prisma.notification.delete({ where: { id: notif.id } });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
