import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

async function getTodosCollection() {
    const client = await clientPromise;
    const db = client.db(); 
    return db.collection('todos');
}

export async function GET() {
    try {
        const todosCollection = await getTodosCollection();
        const todos = await todosCollection.find({}).toArray();
        return NextResponse.json(todos);
    } catch (e) {
        return new NextResponse('Error fetching todos', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { text } = await request.json();
        if (!text) {
            return new NextResponse('Text is required', { status: 400 });
        }
        const todosCollection = await getTodosCollection();
        const count = await todosCollection.countDocuments();
        const newTodo = { text, completed: false, order: count };
        const result = await todosCollection.insertOne(newTodo);
        const createdTodo = await todosCollection.findOne({ _id: result.insertedId });
        return NextResponse.json(createdTodo, { status: 201 });
    } catch (e) {
        console.error("Error creating todo:", e);
        return new NextResponse('Error creating todo', { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { _id, ...fieldsToUpdate } = await request.json();
        if (!_id) {
            return new NextResponse('ID is required', { status: 400 });
        }
        const todosCollection = await getTodosCollection();
        const result = await todosCollection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: fieldsToUpdate }
        );
        if (result.matchedCount === 0) {
            return new NextResponse('Todo not found', { status: 404 });
        }
        return NextResponse.json({ message: "Todo updated successfully" });
    } catch (e) {
        return new NextResponse('Error updating todo', { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { _id } = await request.json();
        const todosCollection = await getTodosCollection();

        const result = await todosCollection.deleteOne({ _id: new ObjectId(_id) });

        if (result.deletedCount === 0) {
            return new NextResponse('Todo not found', { status: 404 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (e) {
        return new NextResponse('Error deleting todo', { status: 500 });
    }
}