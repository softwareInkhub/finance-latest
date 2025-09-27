import { NextResponse } from 'next/server';
import { brmhCrud, TABLES, getBankTransactionTable } from '../brmh-client';
import { recomputeAndSaveTagsSummary } from '../reports/tags-summary/aggregate';
import { v4 as uuidv4 } from 'uuid';
import { getUniqueColor, getExistingColors } from '../../utils/colorUtils';

export const runtime = 'nodejs';



// Type definitions for cashflow data structures
interface CashFlowItem {
  id: string;
  particular: string;
  amount?: number;
  createdByTag?: boolean;
  subItems?: CashFlowItem[];
}

interface CashFlowGroup {
  id: string;
  title: string;
  items: CashFlowItem[];
}

interface CashFlowSection {
  id: string;
  title: string;
  type: string;
  groups: CashFlowGroup[];
}

// Helper function to update tag names in cashflow reports
async function updateTagNamesInCashflow(userId: string, oldTagName: string, newTagName: string): Promise<void> {
  try {
    // Get the current cashflow data
    const cashflowResult = await brmhCrud.getItem(TABLES.REPORTS, { id: `cashflow_${userId}` });
    
    if (!cashflowResult.item?.cashFlowData) {
      console.log(`No cashflow data found for user ${userId}`);
      return;
    }
    
    const cashFlowData = cashflowResult.item.cashFlowData;
    let hasChanges = false;
    
    // Helper function to recursively update tag names
    const updateTagNames = (sections: CashFlowSection[]): CashFlowSection[] => {
      return sections.map(section => ({
        ...section,
        groups: section.groups.map((group: CashFlowGroup) => ({
          ...group,
          items: group.items.map((item: CashFlowItem) => {
            const updatedItem = { ...item };
            
            // Update main item if it references the old tag name
            if (item.createdByTag === true && item.particular === oldTagName) {
              updatedItem.particular = newTagName;
              hasChanges = true;
            }
            
            // Update sub-items if they exist
            if (item.subItems && item.subItems.length > 0) {
              updatedItem.subItems = item.subItems.map((subItem: CashFlowItem) => {
                const updatedSubItem = { ...subItem };
                
                if (subItem.createdByTag === true && subItem.particular === oldTagName) {
                  updatedSubItem.particular = newTagName;
                  hasChanges = true;
                }
                
                // Update sub-sub-items if they exist
                if (subItem.subItems && subItem.subItems.length > 0) {
                  updatedSubItem.subItems = subItem.subItems.map((subSubItem: CashFlowItem) => {
                    if (subSubItem.createdByTag === true && subSubItem.particular === oldTagName) {
                      hasChanges = true;
                      return { ...subSubItem, particular: newTagName };
                    }
                    return subSubItem;
                  });
                }
                
                return updatedSubItem;
              });
            }
            
            return updatedItem;
          })
        }))
      }));
    };
    
    const updatedCashFlowData = updateTagNames(cashFlowData);
    
    // Save updated cashflow data if changes were made
    if (hasChanges) {
      await brmhCrud.update(TABLES.REPORTS, { id: `cashflow_${userId}` }, {
        cashFlowData: updatedCashFlowData,
        updatedAt: new Date().toISOString(),
      });
      console.log(`Successfully updated tag name from "${oldTagName}" to "${newTagName}" in cashflow reports`);
    } else {
      console.log(`No tag references found in cashflow for "${oldTagName}"`);
    }
  } catch (error) {
    console.error('Error updating tag names in cashflow:', error);
    throw error;
  }
}

// Helper function to completely clear all tag-based items from cashflow
async function clearAllTagBasedItemsFromCashflow(userId: string) {
  try {
    console.log(`Clearing all tag-based items from cashflow for user ${userId}`);
    
    const cashflowResult = await brmhCrud.getItem(TABLES.REPORTS, { id: `cashflow_${userId}` });
    
    if (cashflowResult.item?.cashFlowData) {
      const cashFlowData = cashflowResult.item.cashFlowData;
      let hasChanges = false;
      
      // Helper function to recursively remove ALL tag-based items
      const removeAllTagItems = (sections: CashFlowSection[]): CashFlowSection[] => {
        return sections.map(section => ({
          ...section,
          groups: section.groups.map((group: CashFlowGroup) => ({
            ...group,
            items: group.items.filter((item: CashFlowItem) => {
              // Remove any item that was created by tags
              if (item.createdByTag === true) {
                hasChanges = true;
                console.log(`Removing tag-based cashflow item: ${item.particular}`);
                return false; // Remove this item
              }
              
              // Also check sub-items recursively
              if (item.subItems && item.subItems.length > 0) {
                const filteredSubItems = item.subItems.filter((subItem: CashFlowItem) => {
                  if (subItem.createdByTag === true) {
                    hasChanges = true;
                    console.log(`Removing tag-based cashflow sub-item: ${subItem.particular}`);
                    return false; // Remove this sub-item
                  }
                  
                  // Check sub-sub-items if they exist
                  if (subItem.subItems && subItem.subItems.length > 0) {
                    const filteredSubSubItems = subItem.subItems.filter((subSubItem: CashFlowItem) => {
                      if (subSubItem.createdByTag === true) {
                        hasChanges = true;
                        console.log(`Removing tag-based cashflow sub-sub-item: ${subSubItem.particular}`);
                        return false; // Remove this sub-sub-item
                      }
                      return true; // Keep this sub-sub-item
                    });
                    
                    if (filteredSubSubItems.length !== subItem.subItems.length) {
                      subItem.subItems = filteredSubSubItems;
                    }
                  }
                  
                  return true; // Keep this sub-item
                });
                
                if (filteredSubItems.length !== item.subItems.length) {
                  item.subItems = filteredSubItems;
                }
              }
              
              return true; // Keep this item
            })
          }))
        }));
      };
      
      // Remove all tag-based items from the cashflow data
      const updatedCashFlowData = removeAllTagItems(cashFlowData);
     
      // Save updated cashflow data if changes were made
      if (hasChanges) {
        await brmhCrud.update(TABLES.REPORTS, { id: `cashflow_${userId}` }, {
          cashFlowData: updatedCashFlowData,
          updatedAt: new Date().toISOString(),
        });
        console.log(`Successfully cleared all tag-based items from cashflow for user ${userId}`);
      } else {
        console.log(`No tag-based items found in cashflow for user ${userId}`);
      }
    }
  } catch (error) {
    console.error(`Error clearing tag-based items from cashflow for user ${userId}:`, error);
  }
}

// GET /api/tags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Fetch all tags with pagination
    const allTags: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const result = await brmhCrud.scan(TABLES.TAGS, {
        FilterExpression: userId ? 'userId = :userId' : undefined,
        ExpressionAttributeValues: userId ? { ':userId': userId } : undefined,
        itemPerPage: 100
      });
      const tags = result.items || [];
      allTags.push(...tags);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.lastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return NextResponse.json(allTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags
export async function POST(request: Request) {
  try {
    const { name, color, userId } = await request.json();
    if (!name || !userId) return NextResponse.json({ error: 'Tag name and userId required' }, { status: 400 });
    
    // Check if tag with same name already exists for this user (case-insensitive) with pagination
    const existingTags: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const existingTagsResult = await brmhCrud.scan(TABLES.TAGS, {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        itemPerPage: 100
      });
      const batchTags = existingTagsResult.items || [];
      existingTags.push(...batchTags);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = existingTagsResult.lastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Check for case-insensitive duplicate
    if (existingTags.length > 0) {
      const existingTag = existingTags.find(tag => 
        typeof tag.name === 'string' && tag.name.toLowerCase() === name.toLowerCase()
      );
      if (existingTag) {
        return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
      }
    }
    
    // Get existing colors to ensure uniqueness
    const existingColors = getExistingColors(existingTags);
    
    // Generate unique color if not provided
    const uniqueColor = color || getUniqueColor(existingColors);
    
    const tag = {
      id: uuidv4(),
      name,
      color: uniqueColor,
      userId,
      createdAt: new Date().toISOString(),
    };
    await brmhCrud.create(TABLES.TAGS, tag);
    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

// PUT /api/tags
export async function PUT(request: Request) {
  try {
    const { id, name, color } = await request.json();
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });
    
    // Get the tag first to capture userId and old name
    let tagUserId: string | undefined;
    let oldTagName: string | undefined;
    try {
      const tagRes = await brmhCrud.getItem(TABLES.TAGS, { id });
      const tagItem = tagRes.item as Record<string, unknown> | undefined;
      tagUserId = typeof tagItem?.userId === 'string' ? tagItem.userId : undefined;
      oldTagName = typeof tagItem?.name === 'string' ? tagItem.name : undefined;
    } catch (error) {
      console.error('Error fetching tag before update:', error);
    }
    
    // Update the tag in tags table
    await brmhCrud.update(TABLES.TAGS, { id }, {
      name,
      color
    });
    
    // Update tags summary and cashflow reports in brmh-fintech-user-reports table (async)
    if (typeof tagUserId === 'string' && tagUserId.length > 0 && oldTagName && oldTagName !== name) {
      setImmediate(async () => {
        try {
          console.log(`Updating tag name from "${oldTagName}" to "${name}" for user ${tagUserId}`);
          
          // 1. Update cashflow reports to change tag names
          await updateTagNamesInCashflow(tagUserId, oldTagName, name);
          
          // 2. Recompute tags summary
          console.log(`Recomputing tags summary for user ${tagUserId} after updating tag ${id}`);
          await recomputeAndSaveTagsSummary(tagUserId);
          
          console.log(`Successfully updated tag name and tags summary for user ${tagUserId}`);
        } catch (e) {
          console.error('Tag name update in reports failed:', e);
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags - Clear all tag-based items from cashflow
export async function DELETE(request: Request) {
  try {
    const { id, clearAllTagItems } = await request.json();
    
    // Special case: Clear all tag-based items from cashflow
    if (clearAllTagItems && typeof clearAllTagItems === 'string') {
      const userId = clearAllTagItems;
      await clearAllTagBasedItemsFromCashflow(userId);
      return NextResponse.json({ 
        success: true, 
        message: `Cleared all tag-based items from cashflow for user ${userId}` 
      });
    }
    
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });

    // Read tag first to capture userId and name before deletion
    let tagUserId: string | undefined;
    let tagName: string | undefined;
    try {
      const tagRes = await brmhCrud.getItem(TABLES.TAGS, { id });
      const tagItem = tagRes.item as Record<string, unknown> | undefined;
      tagUserId = typeof tagItem?.userId === 'string' ? tagItem.userId : undefined;
      tagName = typeof tagItem?.name === 'string' ? tagItem.name : undefined;
    } catch {}

    // 1. Delete the tag itself
    await brmhCrud.delete(TABLES.TAGS, { id });

    // 2. OPTIMIZED: Move transaction cleanup to background for faster response
    if (typeof tagUserId === 'string' && tagUserId.length > 0) {
      // Run transaction cleanup in background - don't wait for it
      setImmediate(async () => {
        try {
          console.log(`Starting background transaction cleanup for deleted tag ${id} from user ${tagUserId}`);
          
          // Get all banks (we'll filter by userId in the transaction scan)
          const userBanksResult = await brmhCrud.scan(TABLES.BANKS, {
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': tagUserId }
          });
          
          const userBanks = userBanksResult.items || [];
          
          for (const bank of userBanks) {
            const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
            try {
              // Find transactions that contain this tag and belong to this user
              const transactionsWithTag = await brmhCrud.scan(tableName, {
                FilterExpression: 'userId = :userId',
                ExpressionAttributeValues: { ':userId': tagUserId }
              });
              
              const transactionsToUpdate = transactionsWithTag.items || [];
              
              if (transactionsToUpdate.length > 0) {
                // Update transactions in batches for better performance
                const batchSize = 25; // DynamoDB batch limit
                for (let i = 0; i < transactionsToUpdate.length; i += batchSize) {
                  const batch = transactionsToUpdate.slice(i, i + batchSize);
                  
                  const updatePromises = batch.map(async (tx: Record<string, unknown>) => {
                    if (!Array.isArray(tx.tags) || tx.tags.length === 0) return;
                    let changed = false;
                    let newTags: unknown[] = [];
                    // If tags are strings (IDs)
                    if (typeof tx.tags[0] === 'string') {
                      newTags = (tx.tags as string[]).filter((tagId) => tagId !== id);
                      changed = (newTags as string[]).length !== (tx.tags as string[]).length;
                    } else if (typeof tx.tags[0] === 'object' && tx.tags[0] !== null) {
                      // If tags are objects
                      newTags = (tx.tags as Array<{ id?: string }>)
                        .filter((t) => (typeof t?.id === 'string' ? t.id !== id : true));
                      changed = (newTags as unknown[]).length !== (tx.tags as unknown[]).length;
                    }
                    if (!changed) return; // nothing to update

                    await brmhCrud.update(tableName, { id: tx.id }, {
                      tags: newTags
                    });
                  });
                  
                  await Promise.all(updatePromises);
                }
              }
            } catch (error) {
              // If table doesn't exist or other error, skip
              console.log(`Skipping bank table ${tableName}:`, error);
              continue;
            }
          }
          
          console.log(`Completed background transaction cleanup for deleted tag ${id}`);
        } catch (error) {
          console.error('Background transaction cleanup failed:', error);
        }
      });
    }

    // 3. OPTIMIZED: Remove cashflow items that reference this deleted tag (async)
    if (typeof tagUserId === 'string' && tagUserId.length > 0) {
      // Run cashflow cleanup in background - don't wait for it
      setImmediate(async () => {
        try {
          console.log(`Removing cashflow items for deleted tag ${id} from user ${tagUserId}`);
          
          const cashflowResult = await brmhCrud.getItem(TABLES.REPORTS, { id: `cashflow_${tagUserId}` });
          
          if (cashflowResult.item?.cashFlowData) {
            const cashFlowData = cashflowResult.item.cashFlowData;
            let hasChanges = false;
            
            // Helper function to recursively remove tag-based items
            const removeTagItems = (sections: CashFlowSection[]): CashFlowSection[] => {
              return sections.map(section => ({
                ...section,
                groups: section.groups.map((group: CashFlowGroup) => ({
                  ...group,
                  items: group.items.filter((item: CashFlowItem) => {
                    // Check if this item references the deleted tag
                    if (item.createdByTag === true && item.particular === tagName) {
                      hasChanges = true;
                      console.log(`Removing cashflow item: ${item.particular} (matches deleted tag: ${tagName})`);
                      return false; // Remove this item
                    }
                    
                    // Also check sub-items recursively
                    if (item.subItems && item.subItems.length > 0) {
                      const filteredSubItems = item.subItems.filter((subItem: CashFlowItem) => {
                        if (subItem.createdByTag === true && subItem.particular === tagName) {
                          hasChanges = true;
                          console.log(`Removing cashflow sub-item: ${subItem.particular} (matches deleted tag: ${tagName})`);
                          return false; // Remove this sub-item
                        }
                        
                        // Check sub-sub-items if they exist
                        if (subItem.subItems && subItem.subItems.length > 0) {
                          const filteredSubSubItems = subItem.subItems.filter((subSubItem: CashFlowItem) => {
                            if (subSubItem.createdByTag === true && subSubItem.particular === tagName) {
                              hasChanges = true;
                              console.log(`Removing cashflow sub-sub-item: ${subSubItem.particular} (matches deleted tag: ${tagName})`);
                              return false; // Remove this sub-sub-item
                            }
                            return true; // Keep this sub-sub-item
                          });
                          
                          if (filteredSubSubItems.length !== subItem.subItems.length) {
                            subItem.subItems = filteredSubSubItems;
                          }
                        }
                        
                        return true; // Keep this sub-item
                      });
                      
                      if (filteredSubItems.length !== item.subItems.length) {
                        item.subItems = filteredSubItems;
                      }
                    }
                    
                    return true; // Keep this item
                  })
                }))
              }));
            };
            
            // Remove tag-based items from the cashflow data
            const updatedCashFlowData = removeTagItems(cashFlowData);
           
            // Save updated cashflow data if changes were made
            if (hasChanges) {
              await brmhCrud.update(TABLES.REPORTS, { id: `cashflow_${tagUserId}` }, {
                cashFlowData: updatedCashFlowData,
                updatedAt: new Date().toISOString(),
              });
              console.log(`Successfully removed cashflow items for deleted tag ${id}`);
            }
          }
        } catch (e) {
          console.error('Cashflow cleanup after tag delete failed:', e);
        }
      });
    }

    // 4. OPTIMIZED: Recompute tags summary for this user (async)
    if (typeof tagUserId === 'string' && tagUserId.length > 0) {
      // Run tags summary recomputation in background - don't wait for it
      setImmediate(async () => {
        try {
          console.log(`Recomputing tags summary for user ${tagUserId} after deleting tag ${id}`);
          await recomputeAndSaveTagsSummary(tagUserId);
          console.log(`Successfully recomputed tags summary for user ${tagUserId}`);
        } catch (e) {
          console.error('Tags summary recompute after tag delete failed:', e);
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Tag deletion initiated. Background cleanup operations are running.` 
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}