

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Queue Collapse Logic', () {
    Map<String, dynamic> mergePayload(
      Map<String, dynamic> existing,
      Map<String, dynamic> update,
    ) {
      final merged = Map<String, dynamic>.from(existing);
      for (final entry in update.entries) {
        if (entry.value is Map && merged[entry.key] is Map) {
          merged[entry.key] = mergePayload(
            merged[entry.key] as Map<String, dynamic>,
            entry.value as Map<String, dynamic>,
          );
        } else {
          merged[entry.key] = entry.value;
        }
      }
      return merged;
    }

    test('10 تحديثات على نفس المعاملة ينتج payload مدمج', () {
      var payload = <String, dynamic>{'amount': 100, 'counter': 0};

      for (int i = 1; i < 10; i++) {
        payload = mergePayload(payload, {'amount': 100 + i, 'counter': i});
      }

      expect(payload['amount'], 109);
      expect(payload['counter'], 9);
    });

    test('دمج create payload مع update payload يحافظ على كل البيانات', () {
      final createPayload = {'id': 'tx-1', 'amount': 100, 'status': 'created'};
      final updatePayload = {'amount': 150, 'updatedAt': '2024-01-01'};

      final merged = mergePayload(createPayload, updatePayload);

      expect(merged['id'], 'tx-1');
      expect(merged['amount'], 150);
      expect(merged['status'], 'created');
      expect(merged['updatedAt'], '2024-01-01');
    });

    test('دمج متكرر يحتفظ بأحدث القيم', () {
      var payload = <String, dynamic>{'v': 0};

      for (int i = 1; i <= 5; i++) {
        payload = mergePayload(payload, {'v': i});
      }

      expect(payload['v'], 5);
    });

    test('دمج كائنات متداخلة (nested objects)', () {
      final existing = {
        'user': {'name': 'Ahmed', 'age': 25}
      };
      final update = {
        'user': {'age': 26, 'city': 'Kuwait'}
      };

      final merged = mergePayload(existing, update);

      expect(merged['user']['name'], 'Ahmed');
      expect(merged['user']['age'], 26);
      expect(merged['user']['city'], 'Kuwait');
    });

    test('Queue Collapse concept: كل عملية create/update/delete من نفس entityId تندمج', () {
      final queueOps = <Map<String, dynamic>>[];

      void addOperation(String entityId, String opType, Map<String, dynamic> payload) {
        final existingIdx = queueOps.indexWhere(
          (op) => op['entityId'] == entityId && op['operationType'] == opType,
        );

        if (existingIdx >= 0) {
          queueOps[existingIdx] = {
            ...queueOps[existingIdx],
            'payload': mergePayload(
              queueOps[existingIdx]['payload'] as Map<String, dynamic>,
              payload,
            ),
          };
        } else {
          queueOps.add({
            'entityId': entityId,
            'operationType': opType,
            'payload': payload,
          });
        }
      }

      addOperation('tx-1', 'create', {'amount': 100});
      addOperation('tx-1', 'update', {'amount': 110});
      addOperation('tx-1', 'update', {'amount': 120});
      addOperation('tx-2', 'update', {'amount': 200});
      addOperation('tx-1', 'delete', {'reason': 'cancelled'});
      addOperation('tx-3', 'create', {'amount': 300});

      expect(queueOps.length, 5);
      
      final tx1Create = queueOps.firstWhere((op) =>
        op['entityId'] == 'tx-1' && op['operationType'] == 'create');
      expect(tx1Create['payload']['amount'], 100);

      final tx1Update = queueOps.firstWhere((op) => 
        op['entityId'] == 'tx-1' && op['operationType'] == 'update');
      expect(tx1Update['payload']['amount'], 120);

      final tx1Delete = queueOps.firstWhere((op) => 
        op['entityId'] == 'tx-1' && op['operationType'] == 'delete');
      expect(tx1Delete['payload']['reason'], 'cancelled');
    });
  });
}