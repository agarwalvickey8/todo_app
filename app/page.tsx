'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Container, Heading, Input, Button, List, ListItem, IconButton, HStack, Text,
    Spinner, Alert, AlertIcon, useToast, Checkbox, Modal, ModalOverlay, ModalContent,
    ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, AlertDialog,
    AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Box,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, DragHandleIcon } from '@chakra-ui/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Todo {
    _id: string;
    text: string;
    completed: boolean;
    order: number;
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

const updateTodo = async (updatedTodo: Partial<Todo> & { _id: string }): Promise<void> => {
    const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo),
    });
    if (!res.ok) throw new Error('Failed to update todo');
};

const deleteTodo = async (_id: string): Promise<void> => {
    const res = await fetch('/api/todos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id }),
    });
    if (!res.ok) throw new Error('Failed to delete todo');
};

function TodoItem({ todo, onToggleComplete, onEdit, onDelete }: { todo: Todo, onToggleComplete: any, onEdit: any, onDelete: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: todo._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <ListItem
            ref={setNodeRef}
            style={style}
            display="flex"
            alignItems="center"
            p={4}
            bg="gray.100"
            borderRadius="md"
            opacity={transform ? 0.8 : 1}
            boxShadow={transform ? 'lg' : 'none'}
        >
            <Box {...attributes} {...listeners} mr={4} cursor="grab" touchAction="none">
                <DragHandleIcon />
            </Box>
            <Checkbox
                isChecked={todo.completed}
                onChange={() => onToggleComplete(todo)}
                mr={4}
                colorScheme="blue"
                size="lg"
            />
            <Text as={todo.completed ? 's' : 'span'} color={todo.completed ? 'gray.500' : 'inherit'} flex="1">
                {todo.text}
            </Text>
            <HStack spacing={2}>
                <IconButton aria-label="Edit todo" icon={<EditIcon />} variant="ghost" onClick={() => onEdit(todo)} />
                <IconButton aria-label="Delete todo" icon={<DeleteIcon />} variant="ghost" colorScheme="red" onClick={() => onDelete(todo._id)} />
            </HStack>
        </ListItem>
    );
}

export default function Home() {
    const [newTodo, setNewTodo] = useState('');
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [updatedText, setUpdatedText] = useState('');
    const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
    
    const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
    const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure();
    const cancelRef = useRef(null);
    const queryClient = useQueryClient();
    const toast = useToast();

    const { data: todos, isLoading, isError, error } = useQuery<Todo[], Error>({
        queryKey: ['todos'],
        queryFn: fetchTodos,
        select: (data) => (data ? data.sort((a, b) => a.order - b.order) : []),
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
        if (newTodo.trim()){
            addMutation.mutate(newTodo.trim());
        }
    };
    
    const handleToggleComplete = (todo: Todo) => {
        updateMutation.mutate({ _id: todo._id, completed: !todo.completed });
    };

    const openDeleteConfirm = (id: string) => {
        setDeletingTodoId(id);
        onDeleteAlertOpen();
    };

    const confirmDelete = () => {
        if (deletingTodoId) {
            deleteMutation.mutate(deletingTodoId);
        }
        onDeleteAlertClose();
    };

    const openEditModal = (todo: Todo) => {
        setEditingTodo(todo);
        setUpdatedText(todo.text);
        onEditModalOpen();
    };

    const handleUpdateTodoText = () => {
        if (editingTodo && updatedText.trim()) {
            updateMutation.mutate({ _id: editingTodo._id, text: updatedText.trim() });
            onEditModalClose();
        }
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 }}));
    const todoIds = useMemo(() => todos?.map(todo => todo._id) || [], [todos]);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (over && active.id !== over.id && todos) {
            const oldIndex = todoIds.indexOf(active.id);
            const newIndex = todoIds.indexOf(over.id);
            const reorderedTodos = arrayMove(todos, oldIndex, newIndex);
            queryClient.setQueryData(['todos'], reorderedTodos);
            reorderedTodos.forEach((item, index) => {
                if (item.order !== index) {
                    updateMutation.mutate({ _id: item._id, order: index });
                }
            });
        }
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
        <>
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
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
                        <List spacing={3} w="100%">
                            {todos?.map((todo) => (
                                <TodoItem
                                    key={todo._id}
                                    todo={todo}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={openEditModal}
                                    onDelete={openDeleteConfirm}
                                />
                            ))}
                        </List>
                    </SortableContext>
                </DndContext>
            </Container>

            <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Todo</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Input value={updatedText} onChange={(e) => setUpdatedText(e.target.value)} />
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={handleUpdateTodoText}>
                            Save
                        </Button>
                        <Button variant="ghost" onClick={onEditModalClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <AlertDialog
                isOpen={isDeleteAlertOpen}
                leastDestructiveRef={cancelRef}
                onClose={onDeleteAlertClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Todo
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Are you sure? You can't undo this action afterwards.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onDeleteAlertClose}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}