//! Tests for ID types

use cadhy_core::EntityId;
use uuid::Uuid;

#[test]
fn entity_id_new_is_unique() {
    let id1 = EntityId::new();
    let id2 = EntityId::new();
    assert_ne!(id1, id2);
}

#[test]
fn entity_id_from_uuid() {
    let uuid = Uuid::new_v4();
    let id = EntityId::from_uuid(uuid);
    assert_eq!(id.as_uuid(), &uuid);
}

#[test]
fn entity_id_default() {
    let id1 = EntityId::default();
    let id2 = EntityId::default();
    // Default creates new unique IDs
    assert_ne!(id1, id2);
}

#[test]
fn entity_id_display() {
    let id = EntityId::new();
    let display = format!("{}", id);
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    assert!(display.contains('-'));
    assert_eq!(display.len(), 36);
}

#[test]
fn entity_id_clone() {
    let id1 = EntityId::new();
    let id2 = id1;
    assert_eq!(id1, id2);
}

#[test]
fn entity_id_hash() {
    use std::collections::HashMap;

    let id = EntityId::new();
    let mut map = HashMap::new();
    map.insert(id, "test");
    assert_eq!(map.get(&id), Some(&"test"));
}
