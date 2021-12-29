// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {generatePath, useHistory, useRouteMatch} from 'react-router-dom'

import {Board} from '../../blocks/board'
import mutator from '../../mutator'
import IconButton from '../../widgets/buttons/iconButton'
import DeleteIcon from '../../widgets/icons/delete'
import OptionsIcon from '../../widgets/icons/options'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'

import './sidebarBoardItem.scss'
import {Category, CategoryBlocks} from '../../store/sidebar'
import ChevronDown from '../../widgets/icons/chevronDown'
import ChevronRight from '../../widgets/icons/chevronRight'
import CreateNewFolder from '../../widgets/icons/newFolder'
import CreateCategory from '../createCategory/createCategory'
import {useAppSelector} from '../../store/hooks'
import {IUser} from '../../user'
import {getMe} from '../../store/users'
import {Utils} from '../../utils'
import Update from '../../widgets/icons/update'
import Folder from '../../widgets/icons/folder'
import Check from '../../widgets/icons/checkIcon'

import telemetryClient, {TelemetryActions, TelemetryCategory} from '../../telemetry/telemetryClient'

import {getCurrentTeam} from '../../store/teams'

import DeleteBoardDialog from './deleteBoardDialog'

type Props = {
    activeCategoryId?: string
    activeBoardID?: string
    hideSidebar: () => void
    categoryBlocks: CategoryBlocks
    boards: Board[]
    allCategories: Array<CategoryBlocks>
}

const SidebarBoardItem = React.memo((props: Props) => {
    const [collapsed, setCollapsed] = useState(false)
    const intl = useIntl()
    const history = useHistory()

    const [deleteBoardOpen, setDeleteBoardOpen] = useState<boolean>(false)
    const [deleteBoard, setDeleteBoard] = useState<Board>()

    const match = useRouteMatch<{boardId: string, viewId?: string, cardId?: string, workspaceId?: string}>()
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
    const [showUpdateCategoryModal, setShowUpdateCategoryModal] = useState(false)
    const me = useAppSelector<IUser|null>(getMe)

    const team = useAppSelector(getCurrentTeam)
    const teamID = team?.id || ''

    const showBoard = useCallback((boardId) => {
        // if the same board, reuse the match params
        // otherwise remove viewId and cardId, results in first view being selected
        const params = {...match.params, boardId: boardId || ''}
        if (boardId !== match.params.boardId) {
            params.viewId = undefined
            params.cardId = undefined
        }
        const newPath = generatePath(match.path, params)
        history.push(newPath)
        props.hideSidebar()
    }, [match, history])

    // const showView = useCallback((viewId, boardId) => {
    //     const newPath = generatePath(match.path, {...match.params, boardId: boardId || '', viewId: viewId || ''})
    //     history.push(newPath)
    //     props.hideSidebar()
    // }, [match, history])
    //
    // const iconForViewType = (viewType: IViewType): JSX.Element => {
    //     switch (viewType) {
    //     case 'board': return <BoardIcon/>
    //     case 'table': return <TableIcon/>
    //     case 'gallery': return <GalleryIcon/>
    //     case 'calendar': return <CalendarIcon/>
    //     default: return <div/>
    //     }
    // }
    //
    // const duplicateBoard = async (boardId: string) => {
    //     // const oldBoardId = props.activeBoardId
    //     const oldBoardId = ''
    //
    //     await mutator.duplicateBoard(
    //         boardId,
    //         intl.formatMessage({id: 'Mutator.duplicate-board', defaultMessage: 'duplicate board'}),
    //         false,
    //         async (newBoardId) => {
    //             showBoard(newBoardId)
    //         },
    //         async () => {
    //             if (oldBoardId) {
    //                 showBoard(oldBoardId)
    //             }
    //         },
    //     )
    // }

    // const addTemplateFromBoard = async (boardId: string) => {
    //     // const oldBoardId = props.activeBoardId
    //     const oldBoardId = ''
    //
    //     await mutator.duplicateBoard(
    //         boardId,
    //         intl.formatMessage({id: 'Mutator.new-template-from-board', defaultMessage: 'new template from board'}),
    //         true,
    //         async (newBoardId) => {
    //             TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.AddTemplateFromBoard, {board: newBoardId})
    //             showBoard(newBoardId)
    //         },
    //         async () => {
    //             if (oldBoardId) {
    //                 showBoard(oldBoardId)
    //             }
    //         },
    //     )
    // }

    const blocks = props.categoryBlocks.blockIDs || []

    const handleCreateNewCategory = () => {
        setShowCreateCategoryModal(true)
    }

    const handleDeleteCategory = async () => {
        await mutator.deleteCategory(teamID, props.categoryBlocks.id)
    }

    const handleUpdateCategory = async () => {
        setShowUpdateCategoryModal(true)
    }

    const generateMoveToCategoryOptions = (blockID: string) => {
        return props.allCategories.map((category) => (
            <Menu.Text
                key={category.id}
                id={category.id}
                name={category.name}
                icon={category.id === props.categoryBlocks.id ? <Check/> : <Folder/>}
                onClick={async (toCategoryID) => {
                    const fromCategoryID = props.categoryBlocks.id
                    await mutator.moveBlockToCategory(teamID, blockID, toCategoryID, fromCategoryID)
                }}
            />
        ))
    }

    return (
        <div className='SidebarBoardItem'>
            <div
                className={`octo-sidebar-item category ' ${collapsed ? 'collapsed' : 'expanded'} ${props.categoryBlocks.id === props.activeCategoryId ? 'active' : ''}`}
            >
                <IconButton
                    icon={collapsed ? <ChevronRight/> : <ChevronDown/>}
                    onClick={() => setCollapsed(!collapsed)}
                />
                <div
                    className='octo-sidebar-title category-title'
                    title={props.categoryBlocks.name}
                >
                    {props.categoryBlocks.name}
                </div>
                <MenuWrapper stopPropagationOnToggle={true}>
                    <IconButton icon={<OptionsIcon/>}/>
                    <Menu position='left'>
                        <Menu.Text
                            id='createNewCategory'
                            name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.CreateNew', defaultMessage: 'Create New Category'})}
                            icon={<CreateNewFolder/>}
                            onClick={handleCreateNewCategory}
                        />
                        {
                            props.categoryBlocks.id !== '' &&
                            <React.Fragment>
                                <Menu.Text
                                    id='deleteCategory'
                                    name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.Delete', defaultMessage: 'Delete Category'})}
                                    icon={<DeleteIcon/>}
                                    onClick={handleDeleteCategory}
                                />
                                <Menu.Text
                                    id='updateCategory'
                                    name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.Update', defaultMessage: 'SidebarCategories.CategoryMenu.Update'})}
                                    icon={<Update/>}
                                    onClick={handleUpdateCategory}
                                />
                            </React.Fragment>
                        }
                    </Menu>
                </MenuWrapper>
            </div>
            {!collapsed && blocks.length === 0 &&
                <div className='octo-sidebar-item subitem no-views'>
                    <FormattedMessage
                        id='Sidebar.no-views-in-board'
                        defaultMessage='No pages inside'
                    />
                </div>}
            {!collapsed && blocks.map((blockID) => {
                const thisBoard = props.boards.find((b) => b.id === blockID)
                const title = thisBoard?.title || intl.formatMessage({id: 'Sidebar.untitled-boardAA', defaultMessage: blockID})
                return (
                    <div
                        key={blockID}
                        className={`octo-sidebar-item subitem ${blockID === props.activeBoardID ? 'active' : ''}`}
                        onClick={() => showBoard(blockID)}
                    >
                        <div className='octo-sidebar-icon'>
                            {thisBoard?.icon}
                        </div>
                        <div
                            className='octo-sidebar-title'
                            title={thisBoard?.title || intl.formatMessage({id: 'Sidebar.untitled-boardAA', defaultMessage: '(asdasdsaUntitled Board)'})}
                        >
                            {title}
                        </div>
                        <MenuWrapper stopPropagationOnToggle={true}>
                            <IconButton icon={<OptionsIcon/>}/>
                            <Menu position='left'>
                                <Menu.Text
                                    key={`deleteBlock-${thisBoard?.id}`}
                                    id='deleteBlock'
                                    name={intl.formatMessage({id: 'Sidebar.delete-board', defaultMessage: 'Delete Board'})}
                                    icon={<DeleteIcon/>}
                                    onClick={() => {
                                        setDeleteBoard(thisBoard!)
                                        setDeleteBoardOpen(true)
                                    }}
                                />
                                <Menu.SubMenu
                                    key={`moveBlock-${thisBoard?.id}`}
                                    id='moveBlock'
                                    name={intl.formatMessage({id: 'SidebarCategories.BlocksMenu.Move', defaultMessage: 'Move To...'})}
                                    icon={<CreateNewFolder/>}
                                    position='bottom'
                                >
                                    {generateMoveToCategoryOptions(blockID)}
                                </Menu.SubMenu>
                            </Menu>
                        </MenuWrapper>
                    </div>
                )
            })}

            {
                showCreateCategoryModal && (
                    <CreateCategory
                        onClose={() => setShowCreateCategoryModal(false)}
                        onCreate={async (name) => {
                            if (!me) {
                                Utils.logError('me not initialized')
                                return
                            }

                            const category: Category = {
                                name,
                                userID: me.id,
                                teamID,
                            } as Category

                            await mutator.createCategory(category)
                            setShowCreateCategoryModal(false)
                        }}
                    />
                )
            }

            {
                showUpdateCategoryModal && (
                    <CreateCategory
                        initialValue={props.categoryBlocks.name}
                        onClose={() => setShowUpdateCategoryModal(false)}
                        onCreate={async (name) => {
                            if (!me) {
                                Utils.logError('me not initialized')
                                return
                            }

                            const category: Category = {
                                name,
                                id: props.categoryBlocks.id,
                                userID: me.id,
                                teamID,
                            } as Category

                            await mutator.updateCategory(category)
                            setShowUpdateCategoryModal(false)
                        }}
                    />
                )
            }

            {deleteBoardOpen && deleteBoard &&
            <DeleteBoardDialog
                boardTitle={deleteBoard.title}
                onClose={() => setDeleteBoardOpen(false)}
                onDelete={async () => {
                    telemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DeleteBoard, {board: deleteBoard.id})
                    mutator.deleteBoard(
                        deleteBoard,
                        intl.formatMessage({id: 'Sidebar.delete-board', defaultMessage: 'Delete board'}),
                        async () => {
                            let nextBoardId: number | undefined
                            if (props.boards.length > 1) {
                                const deleteBoardIndex = props.boards.findIndex((board) => board.id === deleteBoard.id)
                                nextBoardId = deleteBoardIndex + 1 === props.boards.length ? deleteBoardIndex - 1 : deleteBoardIndex + 1
                            }

                            if (nextBoardId) {
                                // This delay is needed because WSClient has a default 100 ms notification delay before updates
                                setTimeout(() => {
                                    showBoard(props.boards[nextBoardId as number].id)
                                }, 120)
                            }
                        },
                        async () => {
                            showBoard(deleteBoard.id)
                        },
                    )
                }}
            />}
        </div>
    )
})

export default SidebarBoardItem
