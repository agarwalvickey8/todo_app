'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Heading, Input, Button, List, ListItem, IconButton, HStack, Text, Spinner, Alert, AlertIcon, useToast } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

const fetchTodos = async (): Promise<Todo[]> => {
    const res = await fetch('/api/todos');
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
};

const addTodo = async (text: string): Promise<Todo> => {
    const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to create todo');
    return res.json();
};

const updateTodo = async (updatedTodo: Todo): Promise<Todo> => {
    const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo),
    });
    if (!res.ok) throw new Error('Failed to update todo');
    return res.json();
};

const deleteTodo = async (_id: string): Promise<void> => {
    const res = await fetch('/api/todos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id }),
    });
    if (!res.ok) throw new Error('Failed to delete todo');
};

export default function Home() {
    const [newTodo, setNewTodo] = useState('');
    const queryClient = useQueryClient();
    const toast = useToast();

    const { data: todos, isLoading, isError, error } = useQuery<Todo[], Error>({
        queryKey: ['todos'],
        queryFn: fetchTodos,
    });

     const addMutation = useMutation({
        mutationFn: addTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] });
            setNewTodo('');
            toast({ title: "Todo added.", status: "success", duration: 2000, isClosable: true });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] });
            toast({ title: "Todo deleted.", status: "info", duration: 2000, isClosable: true });
        },
    });

    const handleAddTodo = () => {
        if (newTodo.trim()) {
            addMutation.mutate(newTodo.trim());
        }
    };

    const handleToggleComplete = (todo: Todo) => {
        updateMutation.mutate({ ...todo, completed: !todo.completed });
    };

    const handleDeleteTodo = (id: string) => {
        deleteMutation.mutate(id);
    };

    if (isLoading) {
        return (
            <Container centerContent p={8}>
                <Spinner size="xl" />
            </Container>
        );
    }

    if (isError) {
        return (
            <Container centerContent p={8}>
                <Alert status="error">
                    <AlertIcon />
                    Error: {error.message}
                </Alert>
            </Container>
        );
    }

    return (
    <Container maxW="container.md" p={8}>
        <Heading as="h1" size="2xl" mb={8} textAlign="center">
            To-Do List
        </Heading>

        <HStack as="form" onSubmit={(e) => { e.preventDefault(); handleAddTodo(); }} w="100%" mb={6}>
            <Input
                variant="filled"
                placeholder="Add a new todo..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
            />
            <Button
                colorScheme="blue"
                px={8}
                type="submit"
                isLoading={addMutation.isPending}
                loadingText="Adding"
            >
                Add
            </Button>
        </HStack>

        <List spacing={3} w="100%">
            {todos?.map((todo) => (
                <ListItem
                    key={todo._id}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    p={4}
                    bg="gray.100"
                    borderRadius="md"
                >
                    <Text
                        as={todo.completed ? 's' : 'span'}
                        color={todo.completed ? 'gray.500' : 'inherit'}
                        cursor="pointer"
                        onClick={() => handleToggleComplete(todo)}
                    >
                        {todo.text}
                    </Text>
                    <IconButton
                        aria-label="Delete todo"
                        icon={<DeleteIcon />}
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteTodo(todo._id)}
                    />
                </ListItem>
            ))}
        </List>
    </Container>
    );
}