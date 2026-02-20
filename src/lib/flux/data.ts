'use server';

import { adminDb } from './firebase-admin';
import { getCurrentUserId } from './auth';
import { FieldValue } from 'firebase-admin/firestore';

// --- Types ---

export interface Project {
    project_id: string;
    user_id: string;
    display_name: string;
    created_at: string;
    dialect?: 'mysql' | 'postgresql' | 'oracle';
}

export interface Table {
    table_id: string;
    project_id: string;
    table_name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface Column {
    id?: string;
    column_id: string;
    table_id: string;
    column_name: string;
    data_type: 'INT' | 'VARCHAR' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP' | 'FLOAT' | 'TEXT';
    is_primary_key: boolean;
    is_nullable: boolean;
    default_value?: string;
    created_at?: string;
}

export interface Row {
    id: string;
    [key: string]: any;
}

export type ConstraintType = 'PRIMARY KEY' | 'FOREIGN KEY';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT';

export interface Constraint {
    constraint_id: string;
    table_id: string;
    type: ConstraintType;
    column_names: string;
    referenced_table_id?: string;
    referenced_column_names?: string;
    on_delete?: ReferentialAction;
    on_update?: ReferentialAction;
}

// --- Projects ---

export async function getProjectsForCurrentUser(): Promise<Project[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    try {
        const snapshot = await adminDb.collection('users').doc(userId).collection('projects').get();
        return snapshot.docs.map(doc => ({
            project_id: doc.id,
            ...doc.data()
        } as Project));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

export async function getProjectById(projectId: string, explicitUserId?: string): Promise<Project | null> {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) return null;

    try {
        const doc = await adminDb.collection('users').doc(userId).collection('projects').doc(projectId).get();
        if (!doc.exists) return null;
        return { project_id: doc.id, ...doc.data() } as Project;
    } catch (error) {
        console.error("Error fetching project:", error);
        return null;
    }
}

// --- Tables ---

export async function getTablesForProject(projectId: string, explicitUserId?: string): Promise<Table[]> {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const snapshot = await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables')
        .get();

    return snapshot.docs.map(doc => ({
        table_id: doc.id,
        ...doc.data()
    } as Table));
}

export async function createTable(projectId: string, tableName: string, description: string, columns: Column[], explicitUserId?: string): Promise<Table> {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const projectRef = adminDb.collection('users').doc(userId).collection('projects').doc(projectId);
    const tableRef = projectRef.collection('tables').doc();

    const table: Table = {
        table_id: tableRef.id,
        project_id: projectId,
        table_name: tableName,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const batch = adminDb.batch();

    // 1. Create Table Doc
    batch.set(tableRef, table);

    // 2. Create Column Docs
    const columnsRef = tableRef.collection('columns');
    for (const col of columns) {
        const colDoc = columnsRef.doc();
        const colData: any = {
            ...col,
            column_id: colDoc.id,
            table_id: tableRef.id,
            created_at: new Date().toISOString()
        };
        Object.keys(colData).forEach(key => colData[key] === undefined && delete colData[key]);
        batch.set(colDoc, colData);
    }

    await batch.commit();
    return table;
}

export async function deleteTable(projectId: string, tableId: string, explicitUserId?: string) {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const tableRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId);

    await adminDb.recursiveDelete(tableRef);
}

// --- Columns ---

export async function getColumnsForTable(projectId: string, tableId: string, explicitUserId?: string): Promise<Column[]> {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const query = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('columns');

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        column_id: doc.id,
        ...doc.data()
    } as Column)).sort((a, b) => {
        if (a.created_at && b.created_at) return a.created_at.localeCompare(b.created_at);
        if (a.created_at) return 1;
        if (b.created_at) return -1;
        return a.column_name.localeCompare(b.column_name);
    });
}

export async function addColumn(projectId: string, tableId: string, column: Omit<Column, 'column_id' | 'table_id'>, explicitUserId?: string) {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const columnsRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('columns');

    const colDoc = columnsRef.doc();
    const colData: any = {
        ...column,
        column_id: colDoc.id,
        table_id: tableId,
        created_at: new Date().toISOString()
    };
    Object.keys(colData).forEach(key => colData[key] === undefined && delete colData[key]);

    await colDoc.set(colData);
}

export async function deleteColumn(projectId: string, tableId: string, columnId: string) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('columns').doc(columnId)
        .delete();
}

export async function updateColumn(projectId: string, tableId: string, columnId: string, updates: Partial<Column>) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('columns').doc(columnId)
        .update(updates);
}

// --- Constraints ---

export async function getConstraintsForProject(projectId: string): Promise<Constraint[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const snapshot = await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('constraints')
        .get();

    return snapshot.docs.map(doc => ({
        constraint_id: doc.id,
        ...doc.data()
    } as Constraint));
}

export async function addConstraint(projectId: string, constraint: Omit<Constraint, 'constraint_id'>) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const constraintsRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('constraints');

    const doc = constraintsRef.doc();
    const newConstraint: any = { ...constraint, constraint_id: doc.id };
    Object.keys(newConstraint).forEach(key => newConstraint[key] === undefined && delete newConstraint[key]);

    await doc.set(newConstraint);
    return newConstraint;
}

export async function deleteConstraint(projectId: string, constraintId: string) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('constraints').doc(constraintId)
        .delete();
}

// --- Rows (Data) ---

export async function getTableData(projectId: string, tableName: string, page: number = 1, pageSize: number = 100, explicitUserId?: string) {
    const userId = explicitUserId || await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const tables = await getTablesForProject(projectId, userId);
    const table = tables.find(t => t.table_name === tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    const snapshot = await adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(table.table_id)
        .collection('rows')
        .limit(pageSize)
        .get();

    const rows = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: data.id,
            _id: doc.id
        };
    });
    const totalRows = rows.length;

    return { rows, totalRows };
}

export async function insertRow(projectId: string, tableId: string, rowData: Record<string, any>) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    // Minimal validation - full validation done in Engine or higher level

    const rowsRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('rows');

    if (rowData.id) {
        await rowsRef.doc(rowData.id).set(rowData);
    } else {
        await rowsRef.add(rowData);
    }
}

export async function updateRow(projectId: string, tableId: string, rowId: string, updates: Record<string, any>) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const rowRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('rows').doc(rowId);

    await rowRef.update(updates);
}

export async function deleteRow(projectId: string, tableId: string, rowId: string) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const rowRef = adminDb
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('tables').doc(tableId)
        .collection('rows').doc(rowId);

    await rowRef.delete();
}
